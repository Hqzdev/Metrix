Decision

Держать web-продукт и Telegram runtime разделёнными на уровне apps, env и deployment flow.

Context

Metrix имеет два пользовательских входа:

web-интерфейс для продукта, лендинга и dashboard
Telegram bot runtime для быстрых сценариев бронирования, оплаты, админки и уведомлений

Эти части имеют разные требования:

web оптимизируется под UI, routing, preview и frontend delivery
bot runtime оптимизируется под Telegram updates, queues, Redis, PostgreSQL и service-to-service calls

Options

Один общий runtime:

меньше каталогов
проще показать проект как один app
сложнее разделять env, deployment и ответственность
любой сбой backend/bot может влиять на web delivery

Раздельные apps:

явные границы
независимый запуск и деплой
отдельные env-файлы
проще объяснять архитектуру и production readiness
больше документации и startup steps

Decision

Сохранять apps/web и apps/bot как разные runtime-зоны.
Общие типы, UI и backend helpers выносить в packages только при реальной повторяемости.

Consequences

README и docs должны явно показывать обе зоны проекта.
CI должен проверять web и bot отдельно.
Скриншоты и testing evidence должны разделять web, mobile и Telegram flows.
Deployment docs должны описывать startup sequence для bot runtime отдельно от frontend delivery.

Status

Accepted.
