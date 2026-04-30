# Smart Booking System
### Booking infrastructure for modern offices

Smart Booking System turns room and desk scheduling into a fast, visible and reliable workflow across web, calendars and Telegram.

[Website](https://metrixplatform.vercel.app) • [Docs](./TECH_SPEC.md) • [GitHub](https://github.com/Hqzdev/Metrix/tree/main)

## Product Vision

Офисные ресурсы до сих пор управляются как будто это 2015 год: чаты, таблицы, устные договорённости и постоянная путаница со слотами. Smart Booking System превращает бронирование переговорных и рабочих мест в прозрачный цифровой слой, где доступность видна сразу, синхронизация с календарями работает автоматически, а администраторы наконец получают живую картину использования пространства.

Это продукт не просто про резервирование. Это инфраструктура офисного опыта: быстрее принять решение, проще найти место, меньше конфликтов, больше контроля и аналитики.

## Core Capabilities

### Moderation / Security

- 🛡 Role-based access для сотрудников и администраторов с проверкой прав на backend.
- 🔐 OAuth2-интеграции с Google и Microsoft для безопасного подключения календарей.
- 📜 Audit-ready сценарии для контроля критических действий, отмен и изменений броней.

### Engagement / Growth

- 📲 Telegram-бот для быстрого бронирования без входа в веб-интерфейс.
- ⏰ Автоматические напоминания перед встречами и бронями.
- 📊 Наглядная аналитика, которая повышает фактическое использование офисных ресурсов.

### Automation

- 🚀 Автоматическое создание, перенос и удаление событий в подключённых календарях.
- 🔄 Фоновые очереди для синхронизации, ретраев и тяжёлых операций без нагрузки на UI.
- ⚡ Realtime-обновления доступности переговорных и рабочих мест.

### Monetization

- 💼 Базис для B2B SaaS-модели: офисы, филиалы, зоны, тарифные ограничения и отчёты.
- 📈 Готовая основа для premium analytics, multi-location rollout и enterprise onboarding.

### Community Infrastructure

- 🏢 Единый слой управления переговорными, коворкингом и доступностью пространства.
- 🧩 Модульная архитектура, готовая к расширению под новые сценарии бронирования.
- 🌐 Web + Calendar + Bot experience внутри одной системы истины.

## Why This Product

- No-code first. Пользователь не должен изучать систему, чтобы просто найти свободную переговорную.
- Modular system. Архитектура разбита на доменные блоки, а не на хаотичный набор экранов и API.
- Real-time analytics. Загрузка помещений видна не постфактум, а как управляемый операционный сигнал.
- Built for scale. Очереди, кэш, адаптеры интеграций и модульный backend закладывают рост без раннего переусложнения.
- Privacy-first. Контроль доступа, OAuth2 и защищённая работа с внешними календарями встроены в базовый контур.
- AI-native architecture. Событийная модель и чистые доменные границы позволяют дальше добавлять AI-подсказки, прогнозирование и автоматизацию.

## UI Preview

### Homepage
![Homepage](/apps/web/public/screen/1.png)

### Page 2
![Dashboard](/apps/web/public/screen/2.png)

### Workspace flow
![Workspace Flow](/apps/web/public/screen/3.png)

### Membership
![Membership](/apps/web/public/screen/4.png)

### Analytics
![Analytics](/apps/web/public/screen/5.png)

### Booking Experience
![Booking experience](/apps/web/public/screen/6.png)

### Mobile Version
![Mobile homepage](/apps/web/public/screen/mobile/1.png)
![Mobile booking flow](/apps/web/public/screen/mobile/2.png)
![Mobile analytics](/apps/web/public/screen/mobile/3.png)

### Telegram Bot Version
![Telegram start screen](/apps/web/public/screen/telegram/1.png)
![Telegram booking flow](/apps/web/public/screen/telegram/2.png)
![Telegram admin panel](/apps/web/public/screen/telegram/3.png)

## Tech Stack

- Frontend: `Next.js` / `React` / `TypeScript` / `Tailwind CSS`
- State & Data: `React Query` / `Redux Toolkit`
- Backend: `Node.js` / `PostgreSQL` / `Prisma ORM`
- Queue & Cache: `Redis` / `BullMQ`
- Realtime: `WebSocket` or `SSE`
- Integrations: `Google Calendar API` / `Microsoft Graph API` / `Telegram Bot API`
- Hosting: `Vercel` for frontend, managed cloud runtime for backend services and workers

## Pages Overview

| Page | Description |
| --- | --- |
| `/` | Продуктовый landing с ценностью системы и основными сценариями |
| `/dashboard` | Главная операционная панель сотрудника или администратора |
| `/bookings` | Управление активными, будущими и завершёнными бронями |
| `/resources` | Список переговорных и рабочих мест с доступностью |
| `/analytics` | Карта занятости, utilisation и пиковые часы |
| `/integrations` | Подключение Google и Microsoft календарей |
| `/admin` | Настройки ресурсов, ролей и системных ограничений |
| `/reports` | Экспорт аналитических отчётов и PDF-выгрузок |

## Visual Identity

Smart Booking System должен ощущаться как премиальный B2B-продукт, а не как внутренний корпоративный кабинет.

- Gradient system. Мягкие технологичные градиенты для hero-зон, аналитики и ключевых статусных блоков.
- Typography hierarchy. Контрастная типографика с чётким разделением стратегических заголовков, product copy и плотных data-слоёв.
- Motion & micro-interactions. Анимации подтверждения брони, обновления слотов и смены состояния должны усиливать ясность, а не отвлекать.
- Capsule UI. Скруглённые контролы, собранные сегменты фильтров, статусные плашки и компактные action-капсулы.
- Adaptive layouts. Интерфейс должен одинаково быстро читаться на desktop, tablet и mobile, особенно в сценариях срочного бронирования.

## Quick Start

### Telegram Bot

```bash
cd apps/telegram-bot
npm install
set -a; source .env; set +a
npm run dev
```

Для production-сборки:

```bash
cd apps/telegram-bot
npm run build
npm run start
```

Минимальный `.env` для бота:

```bash
TELEGRAM_BOT_TOKEN=...
YOOKASSA_PROVIDER_TOKEN=...
PAYMENT_CURRENCY=RUB
ADMIN_TELEGRAM_IDS=123456789
```

Переменные для календарей:

```bash
CALENDAR_TOKEN_SECRET=long-random-secret

GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...
GOOGLE_CALENDAR_REDIRECT_URI=...

MICROSOFT_CALENDAR_CLIENT_ID=...
MICROSOFT_CALENDAR_CLIENT_SECRET=...
MICROSOFT_CALENDAR_REDIRECT_URI=...
```

Цены в Telegram-боте показываются в рублях.
Seed-цены вида `$320` конвертируются по правилу `$320 -> 32 000 ₽`.

Минимальный `.env` для backend:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/metrix
JWT_SECRET=long-random-secret
REDIS_URL=redis://localhost:6379
```

## Roadmap

### Now

- Telegram-бот для бронирования, отмены и переноса броней
- Админка в Telegram по `ADMIN_TELEGRAM_IDS`
- Google Calendar и Microsoft Outlook интеграции для событий и busy slots
- JSON-хранилище для локальной разработки

### Next

- PostgreSQL + Prisma вместо JSON-хранилища
- Очереди Redis/BullMQ для напоминаний и calendar sync
- PDF-отчёты и управляемые export pipelines
- Расширенные роли и политики доступа
- Multi-location поддержка для нескольких офисов
- Гибкие правила доступности по расписанию и зонам

### Future

- AI-рекомендации по подбору слотов и переговорных
- Прогнозирование пиковых часов и загрузки
- Enterprise policy engine
- Platform expansion для booking-инфраструктуры за пределами офисных помещений

## Documentation

- [Техническое задание](./TECH_SPEC.md)
- [Архитектура](./ARCHITECTURE.md)
- [Документация](./docs/README.md)
- [Архитектурный индекс](./docs/architecture/README.md)
- [Системный обзор](./docs/architecture/SYSTEM_OVERVIEW.md)
- [Модули](./docs/architecture/MODULES.md)
- [Структура файлов](./docs/architecture/FILE_STRUCTURE.md)
- [API-контракты](./docs/architecture/API_CONTRACTS.md)
- [Схема БД](./docs/architecture/DATABASE_SCHEMA.md)
- [Очереди и события](./docs/architecture/QUEUES_AND_EVENTS.md)
- [Analytics architecture](./docs/architecture/ANALYTICS.md)
- [Интеграции](./docs/architecture/INTEGRATIONS.md)
- [Деплой](./docs/architecture/DEPLOYMENT.md)
- [Apps](./apps/README.md)
- [Telegram Bot src/bot](./apps/telegram-bot/docs/bot-block.md)
- [Telegram Bot src/services](./apps/telegram-bot/docs/services-block.md)
- [Telegram Bot src/lib](./apps/telegram-bot/docs/lib-block.md)
- [Telegram Bot src/commands](./apps/telegram-bot/docs/commands-block.md)
- [Telegram Bot calendar integrations](./apps/telegram-bot/docs/calendar-integrations.md)
- [Packages](./packages/README.md)
- [API Package](./packages/api/README.md)
- [API Backend And Data](./packages/api/docs/backend-data.md)
- [API Queues And Realtime](./packages/api/docs/queues-realtime.md)
- [API Analytics](./packages/api/docs/analytics.md)
- [Shared Package](./packages/shared/README.md)
- [UI Package](./packages/ui/README.md)
- [Prisma](./prisma/README.md)
- [Tests](./tests/README.md)
- [Scripts](./scripts/README.md)
- [Code style](./codestyle.md)
- [Contributing](./CONTRIBUTING.md)

## Built By

Built by haku tm 
Designed with obsession for community experience.
