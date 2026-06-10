# Testing

Тесты в Metrix нужны не для галочки. Они подтверждают, что booking, payment,
calendar sync, web UI и Telegram bot flow продолжают работать после изменения.

## Основные команды

| Команда | Что проверяет |
| --- | --- |
| `npm test` | Root unit/integration tests через `node --test`. |
| `npm run typecheck` | TypeScript для API, bot и web. |
| `npm run openapi:validate` | Синтаксис и shape OpenAPI spec. |
| `npm run prisma:validate` | Root Prisma schema. |
| `npm --prefix apps/web run lint` | Web ESLint правила. |
| `npm --prefix apps/bot run build` | Сборку bot workspaces. |

## Уровни покрытия

- Unit tests проверяют маленькие функции, validators и formatters.
- Integration tests проверяют взаимодействие модулей и инфраструктурных helper-ов.
- Contract tests проверяют публичные HTTP shapes между сервисами и клиентами.
- E2E tests проверяют полный пользовательский flow.
- Production readiness checks проверяют Docker, health, metrics, backup и recovery.

## Что покрывать в первую очередь

1. Booking conflict detection и отмену брони.
2. Payment saga transitions, idempotency и ручной recovery.
3. Calendar sync retry и обработку истекших токенов.
4. Notification rendering и отправку Telegram сообщений.
5. Web формы, где пользователь создает или меняет бронь.

## Evidence

Для важной проверки записывается короткое evidence:

- команда;
- дата;
- окружение;
- результат;
- ошибка, если была;
- follow-up владелец.

Evidence нужен для production readiness, incident drills и изменений, которые
затрагивают платежи, бронирования или security boundary.
