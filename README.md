# <img src="apps/web/public/images/icon-remove.png" width="32" style="vertical-align:middle" /> Metrix

## Инфраструктура бронирования для современных офисов

Metrix — это единая платформа управления офисными ресурсами, которая превращает бронирование переговорных и рабочих мест в прозрачный, управляемый и масштабируемый процесс.

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
<img src="/apps/web/public/screen/telegram/book.png" width="220" />
<img src="/apps/web/public/screen/telegram/book2.png" width="220" />
<img src="/apps/web/public/screen/telegram/book3.png" width="220" />

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

## Структура продукта

| Раздел        | Назначение                |
| ------------- | ------------------------- |
| /             | Продуктовый лендинг       |
| /dashboard    | Операционная панель       |
| /bookings     | Управление бронированиями |
| /resources    | Управление ресурсами      |
| /analytics    | Аналитика использования   |
| /integrations | Интеграции календарей     |
| /admin        | Администрирование         |
| /reports      | Отчёты                    |

---

## Быстрый старт

### Telegram Bot

```bash
cd apps/telegram-bot
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

## Roadmap

### Текущий этап

* Telegram-бот
* Базовые интеграции календарей
* Администрирование

### Следующий этап

* PostgreSQL и Prisma
* Очереди и синхронизация
* Расширенные роли

### Долгосрочное развитие

* AI-рекомендации
* Прогнозирование загрузки
* Enterprise policy engine

---

## Документация

Полная документация доступна в репозитории и включает:

* архитектуру системы
* API контракты
* схемы данных
* описание модулей

---

## Команда

Разработано с фокусом на системный дизайн, масштабируемость и пользовательский опыт.
