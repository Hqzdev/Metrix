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

- audit-log — persistent audit events, query helpers, retention cleanup;
- auth — HMAC service auth, signed user id, OAuth state, bounded body helpers;
- contracts — shared DTOs, request payloads, stream names, event payloads;
- health — DB/Redis health checks and health HTTP helpers;
- observability — metrics, readiness, route normalization, graceful shutdown;
- rbac — roles, permissions, actor factories, policy evaluation;
- redis-bus — Redis Streams, pending retry, DLQ, replay protection, slot locks.

packages/api

Root reusable API-блок.
Это отдельный слой, не весь bot runtime.

docs

Документация.

monitoring

Alert rules и logging config.

tests

Unit, integration и e2e tests.
