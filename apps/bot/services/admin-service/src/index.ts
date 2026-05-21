import { createServer } from 'node:http'
import { MetricsRegistry, createObservedHandler, installGracefulShutdown, sendMetrics, sendReadiness } from '@metrix/observability'
import { PrismaClient } from '@prisma/client'
import { Redis } from 'ioredis'
import { AdminRouter } from './admin-router.js'
import { startAuditRetentionCleanup } from './audit-retention.js'
import { readAdminServiceConfig } from './config.js'
import { AdminServiceLogger } from './logger.js'
import { createSignedHttpClient } from './signed-http-client.js'

const logger = new AdminServiceLogger()
const config = readAdminServiceConfig(process.env)
const prisma = new PrismaClient()
const redis = new Redis(config.redisUrl, { lazyConnect: true, password: process.env.REDIS_PASSWORD })
const metrics = new MetricsRegistry('admin-service')

await redis.connect()

const router = new AdminRouter({
  config,
  httpClient: createSignedHttpClient(config.signingSecret),
  logger,
  prisma,
  redis,
})
const stopAuditRetentionCleanup = startAuditRetentionCleanup({
  intervalMs: config.auditRetentionIntervalMs,
  logger,
  prisma,
  retentionDays: config.auditRetentionDays,
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
      stopAuditRetentionCleanup()
    },
    async () => {
      await redis.quit()
    },
    async () => {
      await prisma.$disconnect()
    },
  ],
  server,
  service: 'admin-service',
})

server.listen(config.port, () => {
  logger.info({
    message: `admin-service listening on :${config.port}`,
    service: 'admin-service',
  })
})
