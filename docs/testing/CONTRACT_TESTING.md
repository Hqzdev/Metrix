# Contract Testing

## Зачем

У нас 8+ микросервисов. TypeScript типы в `@metrix/contracts` описывают что сервисы *должны* возвращать. Но типы стираются при компиляции — ничто не мешает `booking-service` вернуть `{ id: 123 }` вместо `{ id: "abc-..." }`, и TypeScript это не поймает.

Контрактные тесты запускают реальный HTTP-запрос к живому сервису и проверяют форму ответа в runtime. Они отвечают на вопрос: **"Сервис ведёт себя так, как обещает контракт?"**

## Отличие от integration тестов

| | Integration тесты | Contract тесты |
|---|---|---|
| Цель | Проверить бизнес-логику | Проверить форму HTTP-ответа |
| Мутируют данные | Да | Нет (только чтение) |
| Зависят от seed data | Иногда | Да (только наличие) |
| Запускаются в CI | В `api` job | В отдельном `contract` job |
| Нужен live service | Да | Да |

## Структура

```
tests/contracts/
  schema.ts                          # Runtime validators (assertBooking, assertLocation, ...)
  booking-service.contract.test.ts   # Тесты для booking-service
  payment-service.contract.test.ts   # Тесты для payment-service
  calendar-service.contract.test.ts  # Тесты для calendar-service
```

## Запуск локально

```bash
# Запустить нужные сервисы
docker compose -f apps/bot/docker-compose.yml up -d \
  postgres redis pgbouncer db-init \
  booking-service payment-service calendar-service

# Дождаться healthcheck
docker compose -f apps/bot/docker-compose.yml ps

# Запустить контрактные тесты
CONTRACT_TEST=true npm run test:contracts
```

## CI

Contract job запускается в `ci.yml` после `api` и `bot` jobs. Он сам поднимает docker compose, запускает тесты, затем тушит контейнеры.

Если тесты падают, в артефактах CI будут логи сервисов (`Dump service logs on failure` шаг).

## Добавление нового сервиса

1. Добавить типы в `apps/bot/packages/contracts/src/<service>.ts`
2. Добавить validators в `tests/contracts/schema.ts`:

```typescript
export function assertMyServiceResponse(value: unknown, field = 'response'): void {
  assertObject(value, field)
  const r = value as Record<string, unknown>
  assertString(r.id, `${field}.id`)
  // ... остальные поля
}
```

3. Создать `tests/contracts/<service>.contract.test.ts`:

```typescript
import { test, describe } from 'node:test'
import { assertMyServiceResponse } from './schema.js'

const RUN = process.env.CONTRACT_TEST === 'true'
const BASE = process.env.MY_SERVICE_URL ?? 'http://localhost:3007'
const SKIP = RUN ? undefined : 'set CONTRACT_TEST=true'

describe('my-service contract', { skip: SKIP }, () => {
  test('GET /health', async () => { /* ... */ })
  test('GET /items → MyItem[]', async () => { /* ... */ })
})
```

4. Добавить сервис в `contract` job в `ci.yml`:
   - В `docker compose up` команду
   - В env переменные
   - В команду `node --test`

## Что проверяют валидаторы

- Каждое обязательное поле присутствует
- Типы полей совпадают с контрактом (string, number, array и т.д.)
- Enum-значения входят в допустимый набор (например, `status` ∈ `['active', 'cancelled', ...]`)
- ISO 8601 даты парсятся без `NaN`
- Пустые строки не принимаются там, где ожидается непустая строка

## Что НЕ проверяют контрактные тесты

- Бизнес-логику (для этого есть unit тесты)
- Производительность (для этого нужен k6)
- Конкретные значения полей (только форму)
- Авторизацию (проверяется в unit тестах auth модуля)

## Философия

Контрактные тесты намеренно простые и не мутируют данные. Их цель — быть "smoke detector" для контракта: если форма ответа сломалась, тест упадёт за секунды, не дожидаясь staging деплоя.
