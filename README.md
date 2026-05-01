# <img src="apps/web/public/images/icon-remove.png" width="32" style="vertical-align:middle" /> Metrix

## Инфраструктура бронирования для современных офисов

Это единая платформа управления офисными ресурсами, которая превращает бронирование переговорных и рабочих мест в прозрачный, управляемый и масштабируемый процесс.

[Website](https://metrixplatform.vercel.app) • [Docs](./TECH_SPEC.md) • [GitHub](https://github.com/Hqzdev/Metrix/tree/main) • [Telegram](https://t.me/metritxsxbot)

---

## Обзор продукта

В большинстве компаний управление офисными ресурсами остаётся фрагментированным: таблицы, чаты и устные договорённости приводят к конфликтам, неэффективному использованию пространства и отсутствию достоверной аналитики.

Smart Booking System устраняет эти проблемы, создавая единый цифровой слой, в котором:

* доступность ресурсов видна в реальном времени
* синхронизация с календарями автоматизирована
* действия пользователей контролируемы и отслеживаемы
* данные используются как операционный инструмент

Это не просто система бронирования — это инфраструктура офисного взаимодействия.

---

## Ключевые возможности

### Безопасность и контроль

* Role-based access с серверной валидацией прав
* OAuth2 интеграции с Google и Microsoft
* Аудит действий: создание, изменение и отмена броней

### Вовлечение и пользовательский опыт

* Telegram-бот для быстрого доступа без веб-интерфейса
* Автоматические напоминания
* Прозрачная доступность ресурсов

### Автоматизация

* Синхронизация событий с внешними календарями
* Очереди для фоновых задач и retry-логики
* Realtime обновления доступности

### Монетизация и масштабирование

* Архитектура для B2B SaaS
* Поддержка multi-location
* Расширяемая система тарифов и ограничений

### Инфраструктура продукта

* Единая система управления ресурсами
* Модульная архитектура
* Единый источник истины для web, bot и calendar

---

## Ценность продукта

* Простота: пользователь получает доступ к системе без обучения
* Прозрачность: данные о доступности всегда актуальны
* Контроль: администраторы управляют системой, а не реагируют на проблемы
* Масштабируемость: архитектура готова к росту
* Безопасность: доступ и интеграции встроены на уровне ядра

---

## Архитектурные принципы

* Domain-driven структура
* Event-driven взаимодействие
* Разделение read/write слоёв
* Расширяемость через адаптеры интеграций

---

## Интерфейс

### Web

![Homepage](/apps/web/public/screen/1.png)
![Dashboard](/apps/web/public/screen/2.png)
![Workspace](/apps/web/public/screen/3.png)
![Booking](/apps/web/public/screen/4.png)
![Analytics](/apps/web/public/screen/5.png)

### Mobile

<img src="/apps/web/public/screen/mobile/1.png" width="200" />
<img src="/apps/web/public/screen/mobile/2.png" width="200" />
<img src="/apps/web/public/screen/mobile/3.png" width="200" />
<img src="/apps/web/public/screen/mobile/4.png" width="200" />

### Telegram

<img src="/apps/web/public/screen/telegram/start.png" width="220" />
<img src="/apps/web/public/screen/telegram/help.png" width="220" />
<img src="/apps/web/public/screen/telegram/book.png" width="220" />
<img src="/apps/web/public/screen/telegram/book2.png" width="220" />
<img src="/apps/web/public/screen/telegram/book3.png" width="220" />
<img src="/apps/web/public/screen/telegram/payment.png" width="220" />
<img src="/apps/web/public/screen/telegram/completepay.png" width="220" />
<img src="/apps/web/public/screen/telegram/mybook.png" width="220" />
<img src="/apps/web/public/screen/telegram/admin.png" width="220" />
<img src="/apps/web/public/screen/telegram/statistics.png" width="220" />
<img src="/apps/web/public/screen/telegram/analytics.png" width="220" />

---

## Технологический стек

Frontend:

* Next.js
* React
* TypeScript
* Tailwind CSS

Backend:

* Node.js
* PostgreSQL
* Prisma ORM

Инфраструктура:

* Redis
* BullMQ
* WebSocket / SSE

Интеграции:

* Google Calendar API
* Microsoft Graph API
* Telegram Bot API

---

## Структура проекта

```
Metrix/
├── apps/
│   ├── web/                        # Next.js сайт (лендинг + страницы)
│   │   ├── app/
│   │   │   ├── page.tsx            # Главная страница
│   │   │   ├── booking/            # Страница бронирования
│   │   │   ├── locations/          # Список локаций
│   │   │   ├── memberships/        # Тарифы и членство
│   │   │   ├── about/              # О платформе
│   │   │   ├── faq/                # Часто задаваемые вопросы
│   │   │   ├── contact/            # Контакты
│   │   │   ├── privacy/            # Политика конфиденциальности
│   │   │   └── terms/              # Условия использования
│   │   ├── components/             # UI-компоненты сайта
│   │   ├── hooks/                  # React хуки
│   │   ├── lib/                    # Утилиты и хелперы
│   │   └── public/                 # Статика: скриншоты, иконки
│   │
│   └── telegram-bot/               # Telegram-бот бронирования
│       └── src/
│           ├── bot/                # Сообщения, клавиатуры, обработчики
│           ├── commands/           # Команды /start, /help
│           ├── integrations/
│           │   └── calendar/       # Google / Microsoft Calendar OAuth
│           ├── services/           # BookingService, аналитика, слоты
│           └── lib/                # TelegramClient, логгер, env
│
├── packages/
│   ├── api/                        # Backend API (структура)
│   │   └── src/
│   │       ├── contracts/          # Типы и интерфейсы API
│   │       ├── database/           # Слой доступа к данным
│   │       ├── modules/            # Доменные модули
│   │       ├── integrations/       # Внешние интеграции
│   │       ├── queues/             # Очереди фоновых задач (BullMQ)
│   │       └── realtime/           # WebSocket / SSE события
│   │
│   ├── shared/                     # Общий код между пакетами
│   │   └── src/
│   │       ├── constants/          # Константы
│   │       ├── types/              # Общие типы
│   │       └── utils/              # Утилиты
│   │
│   └── ui/                         # Переиспользуемые UI-компоненты
│       └── src/
│           ├── components/
│           └── styles/
│
├── prisma/
│   ├── migrations/                 # Миграции базы данных
│   └── seed/                       # Начальные данные
│
├── tests/
│   ├── e2e/                        # End-to-end тесты
│   ├── integration/                # Интеграционные тесты
│   └── unit/                       # Юнит-тесты
│
├── docs/
│   ├── api/                        # Документация API
│   ├── architecture/               # Архитектурные решения
│   └── telegram-bot/               # Документация бота
│
└── scripts/                        # Вспомогательные скрипты
```

---

## Быстрый старт

### Telegram Bot

```bash
cd apps/bot
npm install
set -a; source .env; set +a
npm run dev
```

Production:

```bash
npm run build
npm run start
```

---

## Статус проекта

Основной объём технического задания закрыт на уровне прототипа и архитектурной базы.
Проект уже содержит web-интерфейс, Telegram-бота, календарные интеграции, админские сценарии, аналитику, очереди и документацию по ключевым блокам.

### Реализовано

* Web-интерфейс Metrix с desktop и mobile preview
* Telegram-бот для бронирования, оплаты, просмотра броней и админских действий
* Админка в Telegram по ID из env
* Управление ценами, статусами, загрузкой и статистикой ресурсов
* Google Calendar OAuth и callback-подключение без ручного ввода code
* Подготовленная Microsoft Calendar архитектура через adapter pattern
* Создание и удаление календарных событий при бронировании и отмене
* Синхронизация busy slots с доступностью ресурсов
* YooKassa/Telegram payments с разбиением платежей до лимита 99 000 ₽
* Напоминания, очереди, event-driven события и realtime-архитектура
* Аналитика: heatmap, utilization, peak hours, PDF reports
* PostgreSQL/Prisma архитектура, API contracts и backend/data документация
* Тестовая структура и документация по тестам
* Документация по блокам Telegram-бота, API, архитектуре и операциям

### Что осталось для production

* Поднять production PostgreSQL, Redis и фоновые workers
* Подключить реальные OAuth credentials и redirect URI на боевом домене
* Настроить HTTPS, секреты, CI/CD и мониторинг
* Прогнать end-to-end сценарии оплаты, календаря и админки на боевых токенах
* Расширить автотесты вокруг платежей, календарей и конкурентного бронирования

---

## Документация

Полная документация доступна в репозитории и включает архитектуру, API-контракты, схемы данных, интеграции, Telegram-бота и операционные инструкции.

### Общая

* [Docs overview](./docs/README.md)
* [Apps overview](./apps/README.md)
* [Technical specification](./TECH_SPEC.md)

### Архитектура

* [Architecture overview](./docs/architecture/README.md)
* [System overview](./docs/architecture/SYSTEM_OVERVIEW.md)
* [Modules](./docs/architecture/MODULES.md)
* [File structure](./docs/architecture/FILE_STRUCTURE.md)
* [Database schema](./docs/architecture/DATABASE_SCHEMA.md)
* [API contracts](./docs/architecture/API_CONTRACTS.md)
* [Integrations](./docs/architecture/INTEGRATIONS.md)
* [Queues and events](./docs/architecture/QUEUES_AND_EVENTS.md)
* [Analytics architecture](./docs/architecture/ANALYTICS.md)
* [Deployment](./docs/architecture/DEPLOYMENT.md)

### API и backend

* [Backend and data](./docs/api/backend-data.md)
* [Queues and realtime](./docs/api/queues-realtime.md)
* [Analytics API](./docs/api/analytics.md)

### Telegram Bot

* [Bot block](./docs/telegram-bot/bot-block.md)
* [Commands block](./docs/telegram-bot/commands-block.md)
* [Services block](./docs/telegram-bot/services-block.md)
* [Lib block](./docs/telegram-bot/lib-block.md)
* [Calendar integrations](./docs/telegram-bot/calendar-integrations.md)
* [Reports block](./docs/telegram-bot/reports-block.md)
* [Operations and security](./docs/telegram-bot/operations.md)
* [Telegram bot diagrams](./docs/telegram-bot-diagrams/README.md)

---

## Команда

Разработано с фокусом на системный дизайн, масштабируемость и пользовательский опыт.
