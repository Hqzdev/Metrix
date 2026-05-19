Testing Evidence

Этот документ хранит доказательства тестирования Metrix: какие сценарии проверялись, какими командами, какие артефакты нужно приложить и какие риски остаются.

Назначение

Документ нужен не для галочки.
Он показывает, что система проверяется как инженерный продукт: через unit tests, integration tests, ручные сценарии, нагрузку и скриншоты критичных flows.

Структура папки

screenshots/ — скриншоты web, mobile, Telegram, health checks и demo flows
load/ — результаты k6, Artillery или другого load testing
postman/ — Postman collections и environment-файлы

Production readiness

Подробный checklist после production-grade изменений:

PRODUCTION_READINESS_TEST_REPORT.md

В нём оставлены места для команд, результатов, follow-up задач и скриншотов.

Unit tests

Проверяют изолированную бизнес-логику.

Ожидаемые зоны:

tests/unit
tests/unit/audit
tests/unit/bot
tests/unit/payment

Команда:

```
npm run test:unit
```

Текущий evidence:

- добавить вывод последнего успешного запуска
- добавить список покрытых модулей
- добавить ссылку на CI run после настройки GitHub Actions

Integration tests

Проверяют взаимодействие сервисов, Redis, PostgreSQL и signed service-to-service calls.

Ожидаемые сценарии:

создание бронирования
конкурентное бронирование одного слота
payment hold и освобождение слота
подписанный внутренний HTTP-запрос
replay protection через X-Request-Id
rate limiting в bot-gateway
OAuth state signature validation
audit log write path

Evidence placeholder:

```
Дата:
Commit:
Окружение:
Команда:
Результат:
Ссылка на лог:
```

Manual QA

Сценарии для ручной проверки:

1. Пользователь открывает Telegram bot и выполняет /start.
2. Пользователь выбирает ресурс, дату и слот.
3. Система создаёт hold и не отдаёт этот слот повторно.
4. Пользователь проходит оплату.
5. Система подтверждает бронирование.
6. Calendar-service создаёт calendar event.
7. Notification-service отправляет напоминание.
8. Администратор смотрит статистику и audit log.

Screenshot placeholders

Web:

![Web dashboard placeholder](./screenshots/web-dashboard.png)
![Web booking placeholder](./screenshots/web-booking.png)
![Web analytics placeholder](./screenshots/web-analytics.png)

Mobile:

![Mobile booking placeholder](./screenshots/mobile-booking.png)
![Mobile resource details placeholder](./screenshots/mobile-resource.png)

Telegram:

![Telegram start placeholder](./screenshots/telegram-start.png)
![Telegram booking flow placeholder](./screenshots/telegram-booking-flow.png)
![Telegram payment placeholder](./screenshots/telegram-payment.png)
![Telegram admin placeholder](./screenshots/telegram-admin.png)

Infrastructure:

![Docker compose ps placeholder](./screenshots/docker-compose-ps.png)
![Health checks placeholder](./screenshots/health-checks.png)
![Metrics endpoint placeholder](./screenshots/metrics.png)

Load testing

Цель первого load test — проверить не максимальный предел, а поведение системы под повторяемой нагрузкой.

Минимальные сценарии:

GET /health для всех HTTP-сервисов
POST signed request к booking-service
серия Telegram-like booking commands через bot-gateway
конкурентная попытка занять один слот

Evidence placeholder:

```
Tool:
Scenario:
Virtual users:
Duration:
p95 latency:
Error rate:
Redis CPU/memory:
PostgreSQL connections:
Conclusion:
```

Postman collections

В postman/ нужно хранить:

Metrix local environment
Service-to-service signed request examples
Booking API smoke flow
Calendar OAuth callback negative cases
Admin API smoke flow

Правило обновления

Если меняется API, auth headers, Redis lock, payment flow или calendar flow, этот документ должен получить новую evidence-запись.
