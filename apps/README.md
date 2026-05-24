# Apps

Здесь лежат исполняемые приложения проекта.

## Структура

- `web` — основной сайт на `Next.js`
- `bot` — Telegram bot microservices runtime: gateway, booking, payment, calendar, analytics, admin, notification, worker services

## Зачем это разделение

Сайт и bot runtime — это разные точки входа. Web отвечает за публичный интерфейс, а `apps/bot` содержит микросервисы и shared packages для Telegram booking flow.
