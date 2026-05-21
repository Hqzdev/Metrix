File Structure

Этот документ объясняет структуру проекта.

Главные папки

apps/web

Web-приложение на Next.js.

apps/bot

Telegram bot microservices runtime.

apps/bot/services

Отдельные сервисы:

- bot-gateway;
- booking-service;
- payment-service;
- calendar-service;
- analytics-service;
- admin-service;
- notification-service;
- worker-service.

apps/bot/packages

Общий код для сервисов:

- auth;
- contracts;
- health;
- observability;
- redis-bus;
- audit-log;
- rbac.

packages/api

Root reusable API-блок.
Это отдельный слой, не весь bot runtime.

docs

Документация.

monitoring

Alert rules и logging config.

tests

Unit, integration и e2e tests.
