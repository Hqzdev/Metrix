import { createServer } from 'node:http'
import { PrismaClient } from '@prisma/client'
import { MetricsRegistry, createObservedHandler, installGracefulShutdown, sendMetrics, sendReadiness } from '@metrix/observability'
import { RedisBus } from '@metrix/redis-bus'
import { AnalyticsRouter } from './analytics-router.js'
import { BookingClient } from './booking-client.js'
import { readAnalyticsServiceConfig } from './config.js'
import { registerAnalyticsEventConsumers } from './event-consumers.js'
import { AnalyticsServiceLogger } from './logger.js'

const logger = new AnalyticsServiceLogger()
const config = readAnalyticsServiceConfig(process.env)
const prisma = new PrismaClient()
const bus = new RedisBus(config.redisUrl, undefined, { password: process.env.REDIS_PASSWORD })
const metrics = new MetricsRegistry('analytics-service')

await bus.connect()
await registerAnalyticsEventConsumers(bus, logger, { metrics })

const router = new AnalyticsRouter({
  bookingClient: new BookingClient(config.bookingServiceUrl, config.signingSecret),
  bus,
  config,
  logger,
  prisma,
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
            await bus.ping()
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
      await bus.disconnect()
    },
  ],
  server,
  service: 'analytics-service',
})

server.listen(config.port, () => {
  logger.info({
    message: `analytics-service listening on :${config.port}`,
    service: 'analytics-service',
  })
})
