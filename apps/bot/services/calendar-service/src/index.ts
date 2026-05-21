import { createServer } from 'node:http'
import { PrismaClient } from '@prisma/client'
import { MetricsRegistry, createObservedHandler, installGracefulShutdown, sendMetrics, sendReadiness } from '@metrix/observability'
import { Redis } from 'ioredis'
import { CalendarRouter } from './calendar-router.js'
import { readCalendarServiceConfig } from './config.js'
import { GoogleOAuthClient } from './google-oauth-client.js'
import { CalendarServiceLogger } from './logger.js'

const logger = new CalendarServiceLogger()
const config = readCalendarServiceConfig(process.env)

const prisma = new PrismaClient()
const redis = new Redis(config.redisUrl, { lazyConnect: true, password: process.env.REDIS_PASSWORD })
const metrics = new MetricsRegistry('calendar-service')

await redis.connect()

const googleOAuthClient = new GoogleOAuthClient({
  clientId: config.googleClientId,
  clientSecret: config.googleClientSecret,
  redirectUri: config.googleRedirectUri,
})

const router = new CalendarRouter({
  config,
  googleOAuthClient,
  logger,
  prisma,
  redis,
})

const server = createServer(
  createObservedHandler({
    metrics,
    handler: (req, res) => {
      if (req.method === 'GET' && req.url === '/metrics') {
        sendMetrics(res, metrics)
        return
      }

      if (req.method === 'GET' && req.url === '/ready') {
        void sendReadiness(res, {
          postgres: async () => {
            await prisma.$queryRaw`SELECT 1`
          },
          redis: async () => {
            await redis.ping()
          },
        })
        return
      }

      void router.handle(req, res)
    },
  }),
)

installGracefulShutdown({
  logger,
  resources: [
    async () => {
      await prisma.$disconnect()
    },
    async () => {
      await redis.quit()
    },
  ],
  server,
  service: 'calendar-service',
})

server.listen(config.port, () => {
  logger.info({
    message: `calendar-service listening on :${config.port}`,
    service: 'calendar-service',
  })
})
