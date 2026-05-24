import { Redis } from 'ioredis'
import { BLOCK_TIMEOUT_MS, MAX_DELIVERY_ATTEMPTS, PENDING_CLAIM_IDLE_MS, READ_BATCH_SIZE } from './constants.js'
import { defaultLogger, serializeError } from './logger.js'
import type { BusLogger, ClaimedMessage, PendingMessage, RedisBusOptions, RedisConsumeOptions, StreamReadResult } from './types.js'
import { createDlqStreamName, readStreamField, wait } from './utils.js'

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
  // pub используется для обычных Redis-команд и публикации.
  private readonly pub: Redis
  // sub используется для XREADGROUP и consumer loop.
  private readonly sub: Redis
  private readonly logger: BusLogger
  private readonly intervals: NodeJS.Timeout[] = []
  private closed = false

  constructor(url: string, logger?: BusLogger, options: RedisBusOptions = {}) {
    // lazyConnect даёт сервису явно контролировать момент подключения.
    const redisOptions = { lazyConnect: true, password: options.password }

    this.pub = new Redis(url, redisOptions)
    this.sub = new Redis(url, redisOptions)
    this.logger = logger ?? defaultLogger
  }

  async connect(): Promise<void> {
    // После connect можно запускать publish/consume.
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
    // Поле data содержит JSON-строку события.
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
      // closed останавливает рекурсивный polling loop.
      if (this.closed) return

      let results: StreamReadResult = null
      try {
        // '>' означает читать только новые сообщения, не pending.
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
        )) as StreamReadResult
      } catch (error) {
        if (!this.closed) {
          this.logger.warn({
            consumer,
            error: serializeError(error),
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
            const rawData = readStreamField(fields, 'data')
            if (rawData === undefined) continue

            try {
              // Handler получает уже распарсенный event.
              const data = JSON.parse(rawData) as T
              await handler(data)
              // ACK удаляет сообщение из pending list группы.
              await this.sub.xack(stream, group, id)
            } catch (error) {
              // сообщение не ackается — остаётся в pending list для повторной доставки
              this.logger.warn({
                message: 'RedisBus: handler failed, message left in pending list',
                stream,
                group,
                consumer,
                messageId: id,
                error: serializeError(error),
              })
            }
          }
        }
      }

      if (!this.closed) {
        // setImmediate не даёт переполнить stack.
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
    const dlqStream = createDlqStreamName(stream)

    // Читаем до READ_BATCH_SIZE pending-сообщений, которые idle > PENDING_CLAIM_IDLE_MS.
    const pending = (await this.sub.xpending(
      stream, group,
      'IDLE', String(PENDING_CLAIM_IDLE_MS),
      '-', '+',
      String(READ_BATCH_SIZE),
    )) as PendingMessage[] | null

    if (!pending || pending.length === 0) return

    for (const [id, , , deliveryCount] of pending) {
      if (deliveryCount > MAX_DELIVERY_ATTEMPTS) {
        await this.moveToDlq(stream, group, consumer, dlqStream, id, deliveryCount)
        continue
      }

      await this.retryClaimedMessage(stream, group, consumer, id, deliveryCount, handler)
    }
  }

  /**
   * Возвращает текущий consumer lag — количество необработанных сообщений в группе.
   * Используется для мониторинга: если lag растёт — consumer не успевает.
   */
  async getConsumerLag(stream: string, group: string): Promise<number> {
    try {
      // XINFO GROUPS показывает lag и pending count consumer group.
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
      // Stream может ещё не существовать.
    }
    return 0
  }

  async ping(): Promise<void> {
    // Используется readiness checks.
    await this.pub.ping()
  }

  /**
   * Replay-protection: возвращает true если request-id новый, false если уже видели.
   *
   * Реализовано через SET NX EX — атомарная операция, безопасна при параллельных запросах.
   */
  async checkReplay(requestId: string, ttlSeconds = 60): Promise<boolean> {
    // SET NX EX атомарно создаёт временный ключ.
    const result = await this.pub.set(`replay:${requestId}`, '1', 'EX', ttlSeconds, 'NX')
    return result === 'OK'
  }

  async disconnect(): Promise<void> {
    // Закрываем циклы и Redis-соединения.
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
      // MKSTREAM создаёт stream, если его ещё нет.
      await this.sub.xgroup('CREATE', stream, group, '$', 'MKSTREAM')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (!message.includes('BUSYGROUP')) {
        throw err
      }
      // Group already exists — ожидаемо при повторном старте, не ошибка.
    }
  }

  private async moveToDlq(
    stream: string,
    group: string,
    consumer: string,
    dlqStream: string,
    id: string,
    deliveryCount: number,
  ): Promise<void> {
    // Слишком много попыток — отправляем в DLQ.
    const claimed = (await this.sub.xclaim(stream, group, consumer, PENDING_CLAIM_IDLE_MS, id)) as ClaimedMessage[] | null
    if (!claimed || claimed.length === 0) return

    const [, fields] = claimed[0]
    await this.pub.xadd(
      dlqStream,
      '*',
      'data',
      readStreamField(fields, 'data') ?? '{}',
      'originalStream',
      stream,
      'originalId',
      id,
      'deliveryCount',
      String(deliveryCount),
    )
    await this.sub.xack(stream, group, id)

    this.logger.warn({
      message: `RedisBus: message moved to DLQ after ${deliveryCount} attempts`,
      stream,
      dlqStream,
      messageId: id,
    })
  }

  private async retryClaimedMessage<T>(
    stream: string,
    group: string,
    consumer: string,
    id: string,
    deliveryCount: number,
    handler: (event: T) => Promise<void>,
  ): Promise<void> {
    // XCLAIM — перехватываем сообщение для повторной обработки.
    const claimed = (await this.sub.xclaim(stream, group, consumer, PENDING_CLAIM_IDLE_MS, id)) as ClaimedMessage[] | null
    if (!claimed || claimed.length === 0) return

    const [, fields] = claimed[0]
    const rawData = readStreamField(fields, 'data')
    if (rawData === undefined) return

    try {
      // Повторно обрабатываем то же событие.
      const data = JSON.parse(rawData) as T
      await handler(data)
      await this.sub.xack(stream, group, id)
    } catch (error) {
      this.logger.warn({
        message: 'RedisBus: retry handler failed, will retry again later',
        stream,
        messageId: id,
        deliveryCount,
        error: serializeError(error),
      })
    }
  }

  private startPendingRetry<T>(
    stream: string,
    group: string,
    consumer: string,
    handler: (event: T) => Promise<void>,
    intervalMs: number | undefined,
  ): void {
    // Если interval не задан, retry pending выключен.
    if (!intervalMs || intervalMs <= 0) return

    // running защищает от наложения двух retry проходов.
    let running = false
    const interval = setInterval(() => {
      if (running || this.closed) return
      running = true
      void this.retryPending(stream, group, consumer, handler)
        .catch((error: unknown) => {
          this.logger.warn({
            error: serializeError(error),
            group,
            message: 'RedisBus: pending retry interval failed',
            stream,
          })
        })
        .finally(() => {
          running = false
        })
    }, intervalMs)

    // unref не удерживает процесс только ради interval.
    interval.unref()
    this.intervals.push(interval)
  }

  private startLagCollection(stream: string, group: string, options: RedisConsumeOptions): void {
    // Lag collection включается только если есть interval и callback.
    if (!options.collectLagIntervalMs || options.collectLagIntervalMs <= 0 || !options.onLag) return

    const onLag = options.onLag
    const interval = setInterval(() => {
      if (this.closed) return
      void this.getConsumerLag(stream, group)
        .then(onLag)
        .catch((error: unknown) => {
          this.logger.warn({
            error: serializeError(error),
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
