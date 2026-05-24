const express = require('express')
const http = require('http')
const path = require('path')

// Express отдаёт статический UI и пару API endpoint-ов для dashboard.
const app = express()
// Dashboard доступен на отдельном порту.
const PORT = 9090
// Через Docker socket читаем состояние контейнеров и логи.
const DOCKER_SOCKET = '/var/run/docker.sock'
// Таймаут HTTP health-check запросов к сервисам.
const HTTP_TIMEOUT_MS = 3000

// Список сервисов, которые dashboard показывает в UI.
const SERVICES = [
  // postgres/redis не имеют HTTP /ready, поэтому проверяем их только через Docker.
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

// Отдаём public/index.html и связанные статические файлы.
app.use(express.static(path.join(__dirname, 'public')))

// API для карточек health status.
app.get('/api/health', async (_req, res) => {
  // Проверяем все сервисы параллельно.
  const results = await Promise.all(SERVICES.map(readServiceHealth))
  res.json(results)
})

// SSE endpoint для стриминга логов выбранного сервиса.
app.get('/api/logs/:service', async (req, res) => {
  // Имя сервиса берём из URL.
  const service = req.params.service

  // Эти заголовки включают Server-Sent Events.
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  try {
    // Сначала ищем Docker container для сервиса.
    const container = await findContainer(service)
    if (!container) {
      writeEvent(res, `[docker] container for service "${service}" was not found`)
      res.end()
      return
    }

    // Читаем docker logs через Docker Engine API.
    const dockerReq = http.request(
      {
        socketPath: DOCKER_SOCKET,
        path: `/containers/${container.Id}/logs?stdout=1&stderr=1&follow=1&tail=100&timestamps=1`,
        method: 'GET',
      },
      (dockerRes) => {
        // Docker logs multiplex stream приходит фреймами, поэтому нужен buffer.
        let buffered = Buffer.alloc(0)

        dockerRes.on('data', (chunk) => {
          // Может прийти половина Docker frame, поэтому остаток возвращается обратно в buffered.
          buffered = Buffer.concat([buffered, chunk])
          buffered = streamDockerLogChunk(buffered, (line) => writeEvent(res, line))
        })
        dockerRes.on('end', () => res.end())
      },
    )

    dockerReq.on('error', (error) => {
      // Ошибку Docker API тоже отправляем в SSE, чтобы UI её показал.
      writeEvent(res, `[docker error] ${error.message}`)
      res.end()
    })

    dockerReq.end()
    // Если браузер закрыл вкладку/stream, закрываем Docker request.
    req.on('close', () => dockerReq.destroy())
  } catch (error) {
    writeEvent(res, `[dashboard error] ${error.message}`)
    res.end()
  }
})

// Запускаем dashboard HTTP-сервер.
app.listen(PORT, () => {
  console.log(`[dashboard] http://localhost:${PORT}`)
})

/**
 * Читает health одного сервиса.
 */
async function readServiceHealth(service) {
  // Сначала ищем контейнер и его Docker details.
  const container = await findContainer(service.name).catch(() => null)
  const docker = container ? await readContainerDetails(container.Id).catch(() => null) : null
  const dockerState = docker?.State
  const dockerStatus = dockerState?.Health?.Status ?? dockerState?.Status ?? container?.State ?? 'missing'
  const uptimeSeconds = dockerState?.StartedAt ? secondsSince(dockerState.StartedAt) : null

  // Если у сервиса нет HTTP URL, статус берём только из Docker.
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
    // Для HTTP-сервисов вызываем /ready.
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS)
    const response = await fetch(`${service.url}/ready`, { signal: controller.signal })
    clearTimeout(timeout)

    // /ready обычно возвращает JSON с деталями зависимостей.
    const body = await response.json().catch(() => ({}))
    return {
      name: service.name,
      status: response.ok ? 'ok' : 'error',
      code: response.status,
      uptimeSeconds,
      detail: body,
    }
  } catch (error) {
    // Ошибка сети, timeout или JSON parse превращается в status:error.
    return {
      name: service.name,
      status: 'error',
      code: null,
      uptimeSeconds,
      detail: error.message,
    }
  }
}

/**
 * Делает GET-запрос в Docker Engine API через Unix socket.
 */
function dockerGet(pathname) {
  return new Promise((resolve, reject) => {
    // socketPath позволяет говорить с Docker без TCP-порта.
    const req = http.request({ socketPath: DOCKER_SOCKET, path: pathname, method: 'GET' }, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        // Docker API неуспешный status считаем ошибкой.
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Docker API ${pathname} failed with ${res.statusCode}`))
          return
        }

        try {
          // Docker API возвращает JSON.
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

/**
 * Ищет контейнер Docker Compose сервиса.
 */
async function findContainer(serviceName) {
  // Сначала ищем по стандартному label docker compose.
  const filters = encodeURIComponent(JSON.stringify({ label: [`com.docker.compose.service=${serviceName}`] }))
  const matches = await dockerGet(`/containers/json?all=1&filters=${filters}`)

  // Если найдено несколько контейнеров, берём самый новый.
  if (matches.length > 0) {
    return matches.sort((a, b) => Number(b.Created ?? 0) - Number(a.Created ?? 0))[0]
  }

  // Fallback: ищем по имени контейнера.
  const containers = await dockerGet('/containers/json?all=1')
  return containers.find((container) => {
    const names = container.Names ?? []
    return names.some((name) => name === `/${serviceName}` || name.includes(`-${serviceName}-`))
  })
}

/**
 * Читает подробную информацию о контейнере.
 */
function readContainerDetails(containerId) {
  return dockerGet(`/containers/${containerId}/json`)
}

/**
 * Разбирает бинарный Docker log stream на отдельные строки.
 */
function streamDockerLogChunk(buffer, onLine) {
  let offset = 0

  while (offset + 8 <= buffer.length) {
    // Docker frame header: первые 8 байт, размер payload лежит с offset + 4.
    const size = buffer.readUInt32BE(offset + 4)
    const end = offset + 8 + size
    if (end > buffer.length) break

    // Payload после 8-байтного header — это строка лога.
    const line = buffer.slice(offset + 8, end).toString('utf8').trimEnd()
    if (line) onLine(line)
    offset = end
  }

  // Возвращаем недочитанный хвост buffer, если frame пришёл не полностью.
  return buffer.slice(offset)
}

/**
 * Отправляет одну строку в SSE stream.
 */
function writeEvent(res, line) {
  // JSON.stringify защищает переносы строк и спецсимволы.
  res.write(`data: ${JSON.stringify(line)}\n\n`)
}

/**
 * Считает uptime контейнера в секундах.
 */
function secondsSince(dateString) {
  // Docker StartedAt приходит строкой даты.
  const startedAt = new Date(dateString).getTime()
  if (!Number.isFinite(startedAt)) return null
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
}
