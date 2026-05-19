import { createServer } from 'node:http'
import { PrismaClient } from '@prisma/client'
import { RedisBus } from '@metrix/redis-bus'
import { MetricsRegistry, createObservedHandler, installGracefulShutdown, sendMetrics, sendReadiness } from '@metrix/observability'
import { readPaymentServiceConfig } from './config.js'
import { PaymentServiceLogger } from './logger.js'
import { BookingServiceClient } from './booking-service-client.js'
import { PaymentRouter } from './payment-router.js'
import { startPaymentConsumer } from './payment-consumer.js'
import { startExpiredHoldCleaner } from './expired-hold-cleaner.js'

const logger = new PaymentServiceLogger()
const config = readPaymentServiceConfig(process.env)

const prisma = new PrismaClient()
const bus = new RedisBus(config.redisUrl, undefined, { password: process.env.REDIS_PASSWORD })
await bus.connect()

const bookingClient = new BookingServiceClient(config.bookingServiceUrl, config.paymentSigningSecret)
const metrics = new MetricsRegistry('payment-service')

const router = new PaymentRouter({ bookingClient, bus, config, logger, prisma })
await startPaymentConsumer({ bookingClient, bus, logger, metrics, prisma })
const expiredHoldCleaner = startExpiredHoldCleaner(prisma, logger)

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

server.listen(config.port, () => {
  logger.info({ message: `payment-service listening on :${config.port}`, service: 'payment-service' })
})

installGracefulShutdown({
  logger,
  server,
  service: 'payment-service',
  resources: [
    async () => {
      clearInterval(expiredHoldCleaner)
    },
    async () => {
      await prisma.$disconnect()
    },
    async () => {
      await bus.disconnect()
    },
  ],
})
