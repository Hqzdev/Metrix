import Redis from 'ioredis'

export class RedisBus {
  private readonly pub: Redis
  private readonly sub: Redis

  constructor(url: string) {
    this.pub = new Redis(url, { lazyConnect: true })
    this.sub = new Redis(url, { lazyConnect: true })
  }

  async connect(): Promise<void> {
    await this.pub.connect()
    await this.sub.connect()
  }

  // публикует событие в stream
  async publish<T>(stream: string, event: T): Promise<void> {
    await this.pub.xadd(stream, '*', 'data', JSON.stringify(event))
  }

  // подписывается на stream и вызывает handler для каждого события
  async consume<T>(
    stream: string,
    group: string,
    consumer: string,
    handler: (event: T) => Promise<void>,
  ): Promise<void> {
    try {
      await this.sub.xgroup('CREATE', stream, group, '$', 'MKSTREAM')
    } catch {
      // группа уже существует
    }

    const loop = async (): Promise<void> => {
      const results = (await this.sub.xreadgroup(
        'GROUP',
        group,
        consumer,
        'COUNT',
        '10',
        'BLOCK',
        '5000',
        'STREAMS',
        stream,
        '>',
      )) as Array<[string, Array<[string, string[]]>]> | null

      if (results) {
        for (const [, messages] of results) {
          for (const [id, fields] of messages) {
            const dataIndex = fields.indexOf('data')
            if (dataIndex === -1) continue
            const data = JSON.parse(fields[dataIndex + 1]) as T

            try {
              await handler(data)
              await this.sub.xack(stream, group, id)
            } catch (error) {
              console.error('RedisBus: handler failed', { error, id, stream })
            }
          }
        }
      }

      setImmediate(() => void loop())
    }

    void loop()
  }

  async disconnect(): Promise<void> {
    await this.pub.quit()
    await this.sub.quit()
  }
}
