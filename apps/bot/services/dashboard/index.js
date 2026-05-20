const express = require('express')
const http = require('http')
const path = require('path')

const app = express()
const PORT = 9090
const DOCKER_SOCKET = '/var/run/docker.sock'
const HTTP_TIMEOUT_MS = 3000

const SERVICES = [
  { name: 'postgres', url: null },
  { name: 'redis', url: null },
  { name: 'bot-gateway', url: 'http://bot-gateway:3000' },
  { name: 'booking-service', url: 'http://booking-service:3001' },
  { name: 'calendar-service', url: 'http://calendar-service:3002' },
  { name: 'payment-service', url: 'http://payment-service:3003' },
  { name: 'analytics-service', url: 'http://analytics-service:3005' },
  { name: 'admin-service', url: 'http://admin-service:3006' },
  { name: 'notification-service', url: null },
  { name: 'worker-service', url: null },
]

app.use(express.static(path.join(__dirname, 'public')))

app.get('/api/health', async (_req, res) => {
  const results = await Promise.all(SERVICES.map(readServiceHealth))
  res.json(results)
})

app.get('/api/logs/:service', async (req, res) => {
  const service = req.params.service

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  try {
    const container = await findContainer(service)
    if (!container) {
      writeEvent(res, `[docker] container for service "${service}" was not found`)
      res.end()
      return
    }

    const dockerReq = http.request(
      {
        socketPath: DOCKER_SOCKET,
        path: `/containers/${container.Id}/logs?stdout=1&stderr=1&follow=1&tail=100&timestamps=1`,
        method: 'GET',
      },
      (dockerRes) => {
        let buffered = Buffer.alloc(0)

        dockerRes.on('data', (chunk) => {
          buffered = Buffer.concat([buffered, chunk])
          buffered = streamDockerLogChunk(buffered, (line) => writeEvent(res, line))
        })
        dockerRes.on('end', () => res.end())
      },
    )

    dockerReq.on('error', (error) => {
      writeEvent(res, `[docker error] ${error.message}`)
      res.end()
    })

    dockerReq.end()
    req.on('close', () => dockerReq.destroy())
  } catch (error) {
    writeEvent(res, `[dashboard error] ${error.message}`)
    res.end()
  }
})

app.listen(PORT, () => {
  console.log(`[dashboard] http://localhost:${PORT}`)
})

async function readServiceHealth(service) {
  const container = await findContainer(service.name).catch(() => null)
  const docker = container ? await readContainerDetails(container.Id).catch(() => null) : null
  const dockerState = docker?.State
  const dockerStatus = dockerState?.Health?.Status ?? dockerState?.Status ?? container?.State ?? 'missing'
  const uptimeSeconds = dockerState?.StartedAt ? secondsSince(dockerState.StartedAt) : null

  if (!service.url) {
    const ok = dockerStatus === 'running' || dockerStatus === 'healthy'
    return {
      name: service.name,
      status: ok ? 'ok' : 'error',
      code: null,
      uptimeSeconds,
      detail: dockerStatus,
    }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS)
    const response = await fetch(`${service.url}/ready`, { signal: controller.signal })
    clearTimeout(timeout)

    const body = await response.json().catch(() => ({}))
    return {
      name: service.name,
      status: response.ok ? 'ok' : 'error',
      code: response.status,
      uptimeSeconds,
      detail: body,
    }
  } catch (error) {
    return {
      name: service.name,
      status: 'error',
      code: null,
      uptimeSeconds,
      detail: error.message,
    }
  }
}

function dockerGet(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.request({ socketPath: DOCKER_SOCKET, path: pathname, method: 'GET' }, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Docker API ${pathname} failed with ${res.statusCode}`))
          return
        }

        try {
          resolve(JSON.parse(data))
        } catch (error) {
          reject(error)
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

async function findContainer(serviceName) {
  const filters = encodeURIComponent(JSON.stringify({ label: [`com.docker.compose.service=${serviceName}`] }))
  const matches = await dockerGet(`/containers/json?all=1&filters=${filters}`)

  if (matches.length > 0) {
    return matches.sort((a, b) => Number(b.Created ?? 0) - Number(a.Created ?? 0))[0]
  }

  const containers = await dockerGet('/containers/json?all=1')
  return containers.find((container) => {
    const names = container.Names ?? []
    return names.some((name) => name === `/${serviceName}` || name.includes(`-${serviceName}-`))
  })
}

function readContainerDetails(containerId) {
  return dockerGet(`/containers/${containerId}/json`)
}

function streamDockerLogChunk(buffer, onLine) {
  let offset = 0

  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset + 4)
    const end = offset + 8 + size
    if (end > buffer.length) break

    const line = buffer.slice(offset + 8, end).toString('utf8').trimEnd()
    if (line) onLine(line)
    offset = end
  }

  return buffer.slice(offset)
}

function writeEvent(res, line) {
  res.write(`data: ${JSON.stringify(line)}\n\n`)
}

function secondsSince(dateString) {
  const startedAt = new Date(dateString).getTime()
  if (!Number.isFinite(startedAt)) return null
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
}
