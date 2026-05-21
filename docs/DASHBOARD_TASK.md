# Задача: Локальный Dashboard сервисов Metrix

## Цель

При запуске бота (`npm run dev` в `apps/bot`) автоматически открывается браузер на `http://localhost:9090`, где видно:

- статус каждого микросервиса (зелёный/красный — работает или нет);
- uptime каждого сервиса;
- логи всех сервисов в реальном времени (стримятся через Docker API);
- статус PostgreSQL и Redis.

---

## Что нужно сделать

### Шаг 1 — Создать папку dashboard-сервиса

```
apps/bot/services/dashboard/
├── index.js        # Express сервер + прокси логов
├── public/
│   └── index.html  # UI дашборда
└── package.json
```

---

### Шаг 2 — Создать `package.json`

```json
{
  "name": "dashboard",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

---

### Шаг 3 — Создать `index.js`

Этот сервер делает три вещи:
1. Раздаёт HTML страницу дашборда.
2. Отдаёт `/api/health` — опрашивает `/ready` каждого сервиса и возвращает агрегированный статус.
3. Стримит логи через `/api/logs/:service` — читает логи из Docker socket.

```js
const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const PORT = 9090;

// Список сервисов и их внутренние адреса (внутри docker-сети)
const SERVICES = [
  { name: 'bot-gateway',        url: 'http://bot-gateway:3000' },
  { name: 'booking-service',    url: 'http://booking-service:3001' },
  { name: 'calendar-service',   url: 'http://calendar-service:3002' },
  { name: 'payment-service',    url: 'http://payment-service:3003' },
  { name: 'analytics-service',  url: 'http://analytics-service:3005' },
  { name: 'admin-service',      url: 'http://admin-service:3006' },
  { name: 'notification-service', url: null }, // нет HTTP, только статус
  { name: 'worker-service',     url: null },
];

app.use(express.static(path.join(__dirname, 'public')));

// GET /api/health — возвращает статус всех сервисов
app.get('/api/health', async (req, res) => {
  const results = await Promise.all(
    SERVICES.map(async (svc) => {
      if (!svc.url) {
        return { name: svc.name, status: 'unknown', detail: 'no HTTP endpoint' };
      }
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const r = await fetch(`${svc.url}/ready`, { signal: controller.signal });
        clearTimeout(timeout);
        const body = await r.json().catch(() => ({}));
        return { name: svc.name, status: r.ok ? 'ok' : 'error', code: r.status, detail: body };
      } catch (e) {
        return { name: svc.name, status: 'error', detail: e.message };
      }
    })
  );
  res.json(results);
});

// GET /api/logs/:service — стримит логи сервиса через Docker socket
app.get('/api/logs/:service', (req, res) => {
  const service = req.params.service;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Запрос к Docker Engine API через unix socket
  const options = {
    socketPath: '/var/run/docker.sock',
    path: `/containers/bot-${service}-1/logs?stdout=1&stderr=1&follow=1&tail=100&timestamps=1`,
    method: 'GET',
  };

  const dockerReq = http.request(options, (dockerRes) => {
    dockerRes.on('data', (chunk) => {
      // Docker logs stream имеет 8-байтный header перед каждым сообщением
      // Парсим его и берём только текст
      let offset = 0;
      while (offset + 8 <= chunk.length) {
        const size = chunk.readUInt32BE(offset + 4);
        if (offset + 8 + size > chunk.length) break;
        const line = chunk.slice(offset + 8, offset + 8 + size).toString('utf8').trimEnd();
        res.write(`data: ${JSON.stringify(line)}\n\n`);
        offset += 8 + size;
      }
    });
    dockerRes.on('end', () => res.end());
  });

  dockerReq.on('error', (e) => {
    res.write(`data: ${JSON.stringify('[docker error] ' + e.message)}\n\n`);
    res.end();
  });

  dockerReq.end();

  req.on('close', () => dockerReq.destroy());
});

app.listen(PORT, () => {
  console.log(`[dashboard] http://localhost:${PORT}`);
});
```

---

### Шаг 4 — Создать `public/index.html`

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>Metrix Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: monospace; background: #0f0f0f; color: #e0e0e0; padding: 24px; }
    h1 { font-size: 1.4rem; margin-bottom: 20px; color: #fff; }
    h2 { font-size: 1rem; margin: 24px 0 10px; color: #aaa; text-transform: uppercase; letter-spacing: 1px; }

    /* Health grid */
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    .card {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .card .name { font-size: 0.85rem; color: #aaa; margin-bottom: 6px; }
    .card .status { font-size: 1rem; font-weight: bold; }
    .card .detail { font-size: 0.75rem; color: #666; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ok    { color: #4ade80; }
    .error { color: #f87171; }
    .unknown { color: #facc15; }

    /* Logs */
    .log-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
    .tab {
      padding: 4px 12px;
      border-radius: 4px;
      background: #1a1a1a;
      border: 1px solid #333;
      cursor: pointer;
      font-size: 0.8rem;
      color: #aaa;
    }
    .tab.active { background: #2a2a2a; border-color: #555; color: #fff; }
    .log-box {
      background: #111;
      border: 1px solid #222;
      border-radius: 6px;
      height: 380px;
      overflow-y: auto;
      padding: 12px;
      font-size: 0.78rem;
      line-height: 1.5;
    }
    .log-line { white-space: pre-wrap; word-break: break-all; }
    .log-line.err { color: #f87171; }
    .log-line.warn { color: #facc15; }
    .ts { color: #555; margin-right: 6px; }
    .refresh-note { font-size: 0.75rem; color: #444; margin-top: 8px; }
  </style>
</head>
<body>

<h1>Metrix — Service Dashboard</h1>

<h2>Health Status</h2>
<div class="grid" id="grid">Loading...</div>
<p class="refresh-note" id="lastCheck"></p>

<h2>Logs</h2>
<div class="log-tabs" id="tabs"></div>
<div class="log-box" id="logBox"></div>

<script>
  const SERVICES = [
    'bot-gateway','booking-service','calendar-service',
    'payment-service','analytics-service','admin-service',
    'notification-service','worker-service'
  ];

  let currentService = SERVICES[0];
  let currentEs = null;

  // ── Health polling ──────────────────────────────────────────
  async function fetchHealth() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      renderHealth(data);
      document.getElementById('lastCheck').textContent =
        'Обновлено: ' + new Date().toLocaleTimeString('ru');
    } catch (e) {
      document.getElementById('grid').textContent = 'Ошибка соединения с dashboard сервером';
    }
  }

  function renderHealth(services) {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    services.forEach(svc => {
      const card = document.createElement('div');
      card.className = 'card';
      const cls = svc.status === 'ok' ? 'ok' : svc.status === 'unknown' ? 'unknown' : 'error';
      const icon = svc.status === 'ok' ? '● online' : svc.status === 'unknown' ? '◌ unknown' : '● offline';
      const detail = typeof svc.detail === 'object'
        ? JSON.stringify(svc.detail)
        : String(svc.detail || '');
      card.innerHTML = `
        <div class="name">${svc.name}</div>
        <div class="status ${cls}">${icon}</div>
        <div class="detail">${detail}</div>
      `;
      grid.appendChild(card);
    });
  }

  // ── Log tabs ────────────────────────────────────────────────
  function renderTabs() {
    const container = document.getElementById('tabs');
    SERVICES.forEach(name => {
      const btn = document.createElement('div');
      btn.className = 'tab' + (name === currentService ? ' active' : '');
      btn.textContent = name;
      btn.onclick = () => switchService(name);
      container.appendChild(btn);
    });
  }

  function switchService(name) {
    currentService = name;
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.toggle('active', t.textContent === name);
    });
    startLogStream(name);
  }

  function startLogStream(service) {
    if (currentEs) currentEs.close();
    const box = document.getElementById('logBox');
    box.innerHTML = '';

    currentEs = new EventSource(`/api/logs/${service}`);
    currentEs.onmessage = (e) => {
      const raw = JSON.parse(e.data);
      const line = document.createElement('div');
      line.className = 'log-line';

      // Подсветка errors и warnings
      if (/error|Error|ERROR/.test(raw)) line.classList.add('err');
      else if (/warn|WARN/.test(raw)) line.classList.add('warn');

      // Разделяем timestamp от сообщения если есть
      const match = raw.match(/^(\S+T\S+Z)\s(.*)$/s);
      if (match) {
        const ts = document.createElement('span');
        ts.className = 'ts';
        ts.textContent = new Date(match[1]).toLocaleTimeString('ru');
        line.appendChild(ts);
        line.appendChild(document.createTextNode(match[2]));
      } else {
        line.textContent = raw;
      }

      box.appendChild(line);
      box.scrollTop = box.scrollHeight;
    };
    currentEs.onerror = () => {
      const line = document.createElement('div');
      line.className = 'log-line err';
      line.textContent = '[поток логов прерван или сервис недоступен]';
      box.appendChild(line);
    };
  }

  // ── Init ────────────────────────────────────────────────────
  renderTabs();
  fetchHealth();
  setInterval(fetchHealth, 10000); // обновлять статус каждые 10 сек
  startLogStream(currentService);
</script>
</body>
</html>
```

---

### Шаг 5 — Добавить сервис в `docker-compose.yml`

Добавь в `apps/bot/docker-compose.yml` новый сервис **перед** строкой `volumes:`:

```yaml
  dashboard:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./services/dashboard:/app
      - /var/run/docker.sock:/var/run/docker.sock:ro   # доступ к логам Docker
    command: sh -c "npm install --silent && node index.js"
    ports:
      - '9090:9090'
    depends_on:
      - bot-gateway
    restart: unless-stopped
```

> **Важно:** монтируем Docker socket только для чтения (`ro`). Это безопасно — мы только читаем логи, ничего не запускаем.

---

### Шаг 6 — Автоматически открывать браузер при старте

Если в `apps/bot` есть `package.json` со скриптом `dev`, измени его так:

**До:**
```json
"dev": "docker compose up --build"
```

**После:**
```json
"dev": "docker compose up --build & sleep 20 && open http://localhost:9090"
```

Для Windows (`package.json`):
```json
"dev:win": "docker compose up --build & timeout /t 20 & start http://localhost:9090"
```

> `sleep 20` — ждём пока сервисы поднимутся. Можно увеличить до 30 если машина медленная.

---

## Результат

После `npm run dev` в `apps/bot`:

1. Поднимаются все сервисы.
2. Через 20 секунд открывается браузер на `http://localhost:9090`.
3. Видно сетку с цветными статусами (зелёный/красный).
4. Внизу — логи выбранного сервиса в реальном времени.
5. Статусы обновляются каждые 10 секунд автоматически.

---

## Кому делать

Задачу берёт тот, кто поднимает Docker Compose. Проверить что всё работает — Алексей (тест после внедрения новой функции).

---

## Возможные проблемы

| Проблема | Решение |
|---|---|
| `docker.sock: permission denied` | На Linux: `sudo usermod -aG docker $USER` и перелогиниться |
| Логи пустые | Проверить что контейнер называется `bot-<service>-1` через `docker ps` |
| Браузер не открылся | Открыть вручную `http://localhost:9090` |
| Порт 9090 занят | Поменять на другой в docker-compose и в index.js |
