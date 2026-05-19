Архитектурный индекс

Этот документ описывает папку docs/architecture: системный обзор, модули, файловую структуру, API, БД, очереди, интеграции и infrastructure.

Назначение

Папка docs/architecture хранит архитектурные документы Smart Booking System.
Она нужна как точка входа для команды, чтобы разработчики быстро находили нужный контекст и не восстанавливали архитектуру по коду.

Что лежит в этой папке

SYSTEM_OVERVIEW.md — общий обзор системы и её границ
MODULES.md — доменные модули и их ответственность
FILE_STRUCTURE.md — структура каталогов и список основных файлов проекта
BOT_CODE_MAP.md — простая карта apps/bot: сервисы, packages, файлы и связи между ними
API_CONTRACTS.md — будущие API-маршруты и контракты
API_VERSIONING.md — versioning, deprecation policy и breaking changes
DIAGRAMS.md — Mermaid-схемы микросервисов, request flow, auth, Redis, DB и queues
../openapi/metrix-bot-api.yaml — machine-readable OpenAPI спецификация apps/bot
DATABASE_SCHEMA.md — сущности БД и связи между ними
QUEUES_AND_EVENTS.md — фоновые задачи, события и асинхронные процессы
RETRY_STRATEGY.md — attempts, backoff, jitter и DLQ threshold по потокам
CACHING_STRATEGY.md — Redis cache/state, TTL, invalidation и запреты на кеширование
PAYMENTS_AND_HOLDS.md — payment flow, временная бронь слота и idempotency
ANALYTICS.md — метрики занятости, utilization, peak hours и PDF reports
INTEGRATIONS.md — Google, Microsoft, Telegram и адаптеры
DEPLOYMENT.md — окружения, сервисы, деплой и мониторинг
SECURITY.md — модель безопасности, доверенные границы и production-защита
RATE_LIMIT_STRATEGY.md — лимиты guest, admin и internal traffic
SECURITY_HEADERS_AND_CORS.md — web security headers и CORS policy
SECRET_ROTATION.md — правила ротации service, infrastructure и integration secrets
BACKUP_STRATEGY.md — backup, restore, RPO/RTO и retention
ZERO_DOWNTIME_MIGRATIONS.md — expand/contract, backfill, rollback и deploy order
RBAC_AND_AUDIT.md — роли, permissions, policy checks и persistent audit log
AUDIT_LOG_POLICY.md — чтение audit log, redaction policy и retention
OBSERVABILITY.md — health, readiness, metrics, logs и graceful shutdown
ALERTING.md — базовые production alerts и правила labels
DLQ_REPLAY.md — ручная процедура replay сообщений из dead letter queue
ERROR_CATALOG.md — canonical error codes и migration policy для API errors
MONOREPO_TOOLING.md — npm workspaces, root scripts и критерии для Turbo/Nx
PRODUCTION_READINESS.md — дорожная карта production-grade системных свойств

Порядок чтения

1. SYSTEM_OVERVIEW.md
2. MODULES.md
3. FILE_STRUCTURE.md
4. BOT_CODE_MAP.md
5. DIAGRAMS.md
6. остальные документы по конкретной технической области

Основные зоны проекта

В репозитории уже есть несколько основных зон.

apps
packages
prisma
docs
tests
scripts
monitoring

Правило расширения

Новый архитектурный документ должен описывать одну техническую область.
Если документ начинает смешивать несколько областей, его нужно разделить.
