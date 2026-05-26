const express = require('express')
const http = require('http')
const path = require('path')

const { DOCKER_SOCKET, HTTP_TIMEOUT_MS, PORT, PROMETHEUS_URL, SERVICES } = require('./config')
const { ServiceHttpError } = require('./errors')
const logger = require('./logger')
const { parseServiceName } = require('./validation')

// Express отдаёт статический UI и пару API endpoint-ов для dashboard.
const app = express()
let server

// Отдаём public/index.html и связанные статические файлы.
app.use(express.static(path.join(__dirname, 'public')))

/**
 * Отдаёт liveness dashboard без проверок зависимостей.
 */
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'dashboard' })
})

/**
 * Отдаёт readiness dashboard и проверяет доступность Docker socket.
 */
app.get('/ready', async (_req, res) => {
  try {
    await dockerGet('/_ping')
    res.json({ ok: true, service: 'dashboard', docker: 'ok' })
  } catch (error) {
    logger.error('dashboard readiness failed', error)
    res.status(503).json({ ok: false, service: 'dashboard', docker: 'error' })
  }
})

/**
 * Отдаёт минимальные Prometheus-метрики самого dashboard.
 */
app.get('/metrics', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4')
  res.end('dashboard_up 1\n')
})

/**
 * API для карточек health status.
 */
app.get('/api/health', async (_req, res) => {
  try {
    // Проверяем все сервисы параллельно.
    const results = await Promise.all(SERVICES.map(readServiceHealth))
    res.json(results)
  } catch (error) {
    handleError(res, error)
  }
})

/**
 * API для метрик из Prometheus — возвращает RPS, latency и error rate по каждому сервису.
 */
app.get('/api/metrics', async (_req, res) => {
  try {
    // Все три PromQL запроса идут параллельно, чтобы не тратить лишнее время.
    const [rps, latencyP95, errorRate] = await Promise.all([
      queryPrometheus('sum by (service) (rate(metrix_http_requests_total[1m]))'),
      queryPrometheus(
        'histogram_quantile(0.95, sum by (service, le) (rate(metrix_http_request_duration_ms_bucket[1m])))',
      ),
      queryPrometheus(
        'sum by (service) (rate(metrix_http_requests_total{status=~"5.."}[1m])) / sum by (service) (rate(metrix_http_requests_total[1m]))',
      ),
    ])

    // Собираем данные по каждому сервису в плоский объект для удобства UI.
    const byService = {}

    for (const { metric, value } of rps) {
      const svc = metric.service
      if (!byService[svc]) byService[svc] = {}
      // value[1] — строковое число от Prometheus.
      byService[svc].rps = parseFloat(value[1])
    }

    for (const { metric, value } of latencyP95) {
      const svc = metric.service
      if (!byService[svc]) byService[svc] = {}
      byService[svc].latencyP95Ms = parseFloat(value[1])
    }

    for (const { metric, value } of errorRate) {
      const svc = metric.service
      if (!byService[svc]) byService[svc] = {}
      // NaN означает 0 запросов — ошибок нет по определению.
      const rate = parseFloat(value[1])
      byService[svc].errorRatePct = isNaN(rate) ? 0 : rate * 100
    }

    res.json(byService)
  } catch (error) {
    // Если Prometheus недоступен, возвращаем пустой объект — UI покажет прочерки.
    logger.error('prometheus query failed', error)
    res.json({})
  }
})

/**
 * SSE endpoint для стриминга логов выбранного сервиса.
 */
app.get('/api/logs/:service', async (req, res) => {
  try {
    // Имя сервиса валидируем до открытия SSE, чтобы не отдавать логи чужих контейнеров.
    const service = parseServiceName(req.params.service)

    // Эти заголовки включают Server-Sent Events.
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    // Сначала ищем Docker container для сервиса.
    const container = await findContainer(service)
    if (!container) {
      writeEvent(res, `[docker] container for service "${service}" was not found`)
      res.end()
      return
    }

    streamContainerLogs(req, res, container.Id)
  } catch (error) {
    if (!res.headersSent) {
      handleError(res, error)
      return
    }

    writeEvent(res, `[dashboard error] ${error.message}`)
    res.end()
  }
})

// Запускаем dashboard HTTP-сервер.
server = app.listen(PORT, () => {
  logger.info('dashboard started', { url: `http://localhost:${PORT}` })
})

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

/**
 * Выполняет graceful shutdown HTTP-сервера.
 */
function gracefulShutdown() {
  logger.info('dashboard shutdown requested')

  if (!server) {
    process.exit(0)
    return
  }

  server.close((error) => {
    if (error) {
      logger.error('dashboard shutdown failed', error)
      process.exit(1)
      return
    }

    logger.info('dashboard stopped')
    process.exit(0)
  })
}

/**
 * Выполняет instant query к Prometheus HTTP API и возвращает массив результатов.
 *
 * Документация: https://prometheus.io/docs/prometheus/latest/querying/api/#instant-queries
 */
async function queryPrometheus(query) {
  const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`
  const response = await fetchWithTimeout(url)
  const body = await readJsonBody(response)

  if (!response.ok) {
    throw new ServiceHttpError('Prometheus query failed', response.status, body)
  }

  // Prometheus возвращает { status: 'success', data: { resultType: 'vector', result: [...] } }.
  if (body.status !== 'success') return []
  return body.data.result ?? []
}

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
    const response = await fetchWithTimeout(`${service.url}/ready`)
    const body = await readJsonBody(response)

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
 * Выполняет fetch с единым timeout для всех HTTP health и Prometheus запросов.
 */
async function fetchWithTimeout(url) {
  return fetch(url, { signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) })
}

/**
 * Безопасно читает JSON body, сохраняя текст ошибки если downstream вернул не JSON.
 */
async function readJsonBody(response) {
  const text = await response.text()
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
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
          reject(new ServiceHttpError(`Docker API ${pathname} failed`, res.statusCode, data))
          return
        }

        try {
          // /_ping возвращает plain text, остальные dashboard-вызовы Docker API возвращают JSON.
          resolve(pathname === '/_ping' ? data : JSON.parse(data))
        } catch (error) {
          reject(error)
        }
      })
    })

    req.setTimeout(HTTP_TIMEOUT_MS, () => {
      req.destroy(new Error(`Docker API ${pathname} timed out`))
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
 * Стримит Docker logs в открытый SSE response.
 */
function streamContainerLogs(req, res, containerId) {
  // Читаем docker logs через Docker Engine API.
  const dockerReq = http.request(
    {
      socketPath: DOCKER_SOCKET,
      path: `/containers/${containerId}/logs?stdout=1&stderr=1&follow=1&tail=100&timestamps=1`,
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
 * Обрабатывает ошибку HTTP endpoint-а единым JSON-ответом.
 */
function handleError(res, error) {
  if (error instanceof ServiceHttpError) {
    logger.error('downstream request failed', error, {
      statusCode: error.statusCode,
      responseBody: error.responseBody,
    })
    res.status(error.statusCode).json(error.responseBody)
    return
  }

  if (Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 600) {
    res.status(error.statusCode).json({ error: error.message })
    return
  }

  logger.error('dashboard request failed', error)
  res.status(500).json({ error: 'Internal Server Error' })
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
