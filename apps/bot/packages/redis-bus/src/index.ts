import Redis from 'ioredis'
export { SlotLocker } from './slot-locker.js'

// максимум сообщений за один XREADGROUP — ограничивает размер batch в памяти
const READ_BATCH_SIZE = 10

// время ожидания новых сообщений в BLOCK — баланс между latency и CPU
const BLOCK_TIMEOUT_MS = 5_000

// попытки доставки до отправки в dead-letter queue
const MAX_DELIVERY_ATTEMPTS = 5

// время после которого pending-сообщение считается "зависшим" и может быть XCLAIM-нуто
const PENDING_CLAIM_IDLE_MS = 30_000

type BusLogger = {
  error: (entry: Record<string, unknown>) => void
  warn: (entry: Record<string, unknown>) => void
}

type RedisBusOptions = {
  password?: string
}

type RedisConsumeOptions = {
  collectLagIntervalMs?: number
  onLag?: (lag: number) => void
  retryPendingIntervalMs?: number
}

// дефолтный логгер: структурированный JSON в stderr
const defaultLogger: BusLogger = {
  error: (entry) => console.error(JSON.stringify({ ...entry, level: 'error', timestamp: new Date().toISOString() })),
  warn: (entry) => console.warn(JSON.stringify({ ...entry, level: 'warn', timestamp: new Date().toISOString() })),
}

/**
 * Тонкая обёртка над Redis Streams для pub/sub между сервисами.
 *
 * важно:
 * - pub и sub — отдельные соединения: подписанный Redis-клиент
 *   не может выполнять другие команды.
 * - при падении handler сообщение НЕ ackается и остаётся в pending list.
 *   Повторная доставка выполняется через retryPending и XCLAIM.
 * - logger принимается снаружи, чтобы не создавать скрытые side effects
 *   в библиотечном коде.
 */
export class RedisBus {
  private readonly pub: Redis
  private readonly sub: Redis
  private readonly logger: BusLogger
  private readonly intervals: NodeJS.Timeout[] = []
  private closed = false

  constructor(url: string, logger?: BusLogger, options: RedisBusOptions = {}) {
    const redisOptions = { lazyConnect: true, password: options.password }

    this.pub = new Redis(url, redisOptions)
    this.sub = new Redis(url, redisOptions)
    this.logger = logger ?? defaultLogger
  }

  async connect(): Promise<void> {
    this.closed = false
    await this.pub.connect()
    await this.sub.connect()
  }

  /**
   * Возвращает Redis-клиент для прямого использования (например SlotLocker).
   * Используется только в случаях когда нужен низкоуровневый доступ.
   */
  getRedisClient(): Redis {
    return this.pub
  }

  /**
   * Публикует событие в Redis Stream.
   *
   * Событие сериализуется в JSON и записывается в поле 'data'.
   * ID назначается Redis автоматически (*).
   */
  async publish<T>(stream: string, event: T): Promise<void> {
    await this.pub.xadd(stream, '*', 'data', JSON.stringify(event))
  }

  /**
   * Подписывается на Redis Stream и вызывает handler для каждого сообщения.
   *
   * важно:
   * - consumer group создаётся при первом запуске (MKSTREAM).
   *   При повторном старте "BUSYGROUP already exists" игнорируется —
   *   любая другая ошибка пробрасывается.
   * - handler должен быть идемпотентным: при сбое сообщение останется
   *   в pending list и может быть доставлено повторно через XCLAIM.
   * - падение handler НЕ ackает сообщение — retry на стороне Redis.
   * - падение handler логируется как warn, loop продолжается.
   */
  async consume<T>(
    stream: string,
    group: string,
    consumer: string,
    handler: (event: T) => Promise<void>,
    options: RedisConsumeOptions = {},
  ): Promise<void> {
    await this.ensureConsumerGroup(stream, group)
    this.startPendingRetry(stream, group, consumer, handler, options.retryPendingIntervalMs)
    this.startLagCollection(stream, group, options)

    const loop = async (): Promise<void> => {
      if (this.closed) return

      let results: Array<[string, Array<[string, string[]]>]> | null = null
      try {
        results = (await this.sub.xreadgroup(
          'GROUP',
          group,
          consumer,
          'COUNT',
          String(READ_BATCH_SIZE),
          'BLOCK',
          String(BLOCK_TIMEOUT_MS),
          'STREAMS',
          stream,
          '>',
        )) as Array<[string, Array<[string, string[]]>]> | null
      } catch (error) {
        if (!this.closed) {
          this.logger.warn({
            consumer,
            error: error instanceof Error ? { name: error.name, message: error.message } : error,
            group,
            message: 'RedisBus: consume read failed',
            stream,
          })
          await wait(1_000)
        }
      }

      if (results) {
        for (const [, messages] of results) {
          for (const [id, fields] of messages) {
            const dataIndex = fields.indexOf('data')
            if (dataIndex === -1) continue

            try {
              const data = JSON.parse(fields[dataIndex + 1]) as T
              await handler(data)
              await this.sub.xack(stream, group, id)
            } catch (error) {
              // сообщение не ackается — остаётся в pending list для повторной доставки
              this.logger.warn({
                message: 'RedisBus: handler failed, message left in pending list',
                stream,
                group,
                consumer,
                messageId: id,
                error: error instanceof Error ? { name: error.name, message: error.message } : error,
              })
            }
          }
        }
      }

      if (!this.closed) {
        setImmediate(() => void loop())
      }
    }

    void loop()
  }

  /**
   * Периодически проверяет pending list и переотправляет зависшие сообщения.
   *
   * Алгоритм:
   * 1. XPENDING — читаем сообщения без активного consumer старше PENDING_CLAIM_IDLE_MS
   * 2. XCLAIM — перехватываем их на текущий consumer
   * 3. Если delivery count > MAX_DELIVERY_ATTEMPTS — отправляем в DLQ стрим и ACK
   * 4. Иначе обрабатываем повторно
   *
   * Запускать как фоновый interval: setInterval(() => bus.retryPending(...), 60_000)
   */
  async retryPending<T>(
    stream: string,
    group: string,
    consumer: string,
    handler: (event: T) => Promise<void>,
  ): Promise<void> {
    const dlqStream = `dlq:${stream}`

    // читаем до READ_BATCH_SIZE pending-сообщений которые idle > PENDING_CLAIM_IDLE_MS
    const pending = (await this.sub.xpending(
      stream, group,
      'IDLE', String(PENDING_CLAIM_IDLE_MS),
      '-', '+',
      String(READ_BATCH_SIZE),
    )) as Array<[string, string, number, number]> | null

    if (!pending || pending.length === 0) return

    for (const [id, , , deliveryCount] of pending) {
      if (deliveryCount > MAX_DELIVERY_ATTEMPTS) {
        // слишком много попыток — отправляем в DLQ
        const claimed = (await this.sub.xclaim(stream, group, consumer, PENDING_CLAIM_IDLE_MS, id)) as Array<[string, string[]]> | null
        if (!claimed || claimed.length === 0) continue

        const [, fields] = claimed[0]
        await this.pub.xadd(dlqStream, '*', 'data', fields[fields.indexOf('data') + 1] ?? '{}', 'originalStream', stream, 'originalId', id, 'deliveryCount', String(deliveryCount))
        await this.sub.xack(stream, group, id)

        this.logger.warn({
          message: `RedisBus: message moved to DLQ after ${deliveryCount} attempts`,
          stream,
          dlqStream,
          messageId: id,
        })
        continue
      }

      // XCLAIM — перехватываем сообщение для повторной обработки
      const claimed = (await this.sub.xclaim(stream, group, consumer, PENDING_CLAIM_IDLE_MS, id)) as Array<[string, string[]]> | null
      if (!claimed || claimed.length === 0) continue

      const [, fields] = claimed[0]
      const dataIndex = fields.indexOf('data')
      if (dataIndex === -1) continue

      try {
        const data = JSON.parse(fields[dataIndex + 1]) as T
        await handler(data)
        await this.sub.xack(stream, group, id)
      } catch (error) {
        this.logger.warn({
          message: 'RedisBus: retry handler failed, will retry again later',
          stream,
          messageId: id,
          deliveryCount,
          error: error instanceof Error ? { name: error.name, message: error.message } : error,
        })
      }
    }
  }

  /**
   * Возвращает текущий consumer lag — количество необработанных сообщений в группе.
   * Используется для мониторинга: если lag растёт — consumer не успевает.
   */
  async getConsumerLag(stream: string, group: string): Promise<number> {
    try {
      const info = (await this.pub.xinfo('GROUPS', stream)) as Array<unknown[]> | null
      if (!info) return 0

      for (const entry of info) {
        if (!Array.isArray(entry)) continue
        const nameIdx = entry.indexOf('name')
        if (nameIdx === -1 || entry[nameIdx + 1] !== group) continue
        const lagIdx = entry.indexOf('lag')
        if (lagIdx !== -1) return Number(entry[lagIdx + 1])
        const pelIdx = entry.indexOf('pel-count')
        if (pelIdx !== -1) return Number(entry[pelIdx + 1])
      }
    } catch {
      // stream может ещё не существовать
    }
    return 0
  }

  async ping(): Promise<void> {
    await this.pub.ping()
  }

  /**
   * Replay-protection: возвращает true если request-id новый, false если уже видели.
   *
   * Реализовано через SET NX EX — атомарная операция, безопасна при параллельных запросах.
   */
  async checkReplay(requestId: string, ttlSeconds = 60): Promise<boolean> {
    const result = await this.pub.set(`replay:${requestId}`, '1', 'EX', ttlSeconds, 'NX')
    return result === 'OK'
  }

  async disconnect(): Promise<void> {
    this.closed = true
    for (const interval of this.intervals) {
      clearInterval(interval)
    }
    this.intervals.length = 0
    await this.pub.quit()
    await this.sub.quit()
  }

  /**
   * Создаёт consumer group, если её ещё нет.
   *
   * BUSYGROUP — ожидаемая ошибка при повторном старте consumer.
   * Любая другая ошибка означает проблему с Redis и пробрасывается.
   */
  private async ensureConsumerGroup(stream: string, group: string): Promise<void> {
    try {
      await this.sub.xgroup('CREATE', stream, group, '$', 'MKSTREAM')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (!message.includes('BUSYGROUP')) {
        throw err
      }
      // group already exists — ожидаемо при повторном старте, не ошибка
    }
  }

  private startPendingRetry<T>(
    stream: string,
    group: string,
    consumer: string,
    handler: (event: T) => Promise<void>,
    intervalMs: number | undefined,
  ): void {
    if (!intervalMs || intervalMs <= 0) return

    let running = false
    const interval = setInterval(() => {
      if (running || this.closed) return
      running = true
      void this.retryPending(stream, group, consumer, handler)
        .catch((error: unknown) => {
          this.logger.warn({
            error: error instanceof Error ? { name: error.name, message: error.message } : error,
            group,
            message: 'RedisBus: pending retry interval failed',
            stream,
          })
        })
        .finally(() => {
          running = false
        })
    }, intervalMs)

    interval.unref()
    this.intervals.push(interval)
  }

  private startLagCollection(stream: string, group: string, options: RedisConsumeOptions): void {
    if (!options.collectLagIntervalMs || options.collectLagIntervalMs <= 0 || !options.onLag) return

    const onLag = options.onLag
    const interval = setInterval(() => {
      if (this.closed) return
      void this.getConsumerLag(stream, group)
        .then(onLag)
        .catch((error: unknown) => {
          this.logger.warn({
            error: error instanceof Error ? { name: error.name, message: error.message } : error,
            group,
            message: 'RedisBus: consumer lag collection failed',
            stream,
          })
        })
    }, options.collectLagIntervalMs)

    interval.unref()
    this.intervals.push(interval)
  }
}

async function wait(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms))
}
