import { Redis } from 'ioredis'

export type RedisConnectionOptions = {
  url: string
}

export type RedisConnection = Redis

// создает подключение redis для очередей и realtime инфраструктуры
export function createRedisConnection(options: RedisConnectionOptions): Redis {
  return new Redis(options.url, {
    maxRetriesPerRequest: null,
  })
}
