ADR 0003: Keep Web And Bot Runtime Separated

Status

Accepted.

Context

Web-приложение и Telegram bot runtime имеют разные задачи.

Web отвечает за сайт и UI.
Bot runtime отвечает за Telegram updates, сервисы, очереди, оплату и фоновые задачи.

Decision

Держать web и bot runtime отдельно.

Consequences

Плюсы:

- проще деплоить отдельно;
- проще масштабировать;
- меньше смешивания UI и backend логики;
- bot runtime может иметь свои сервисы и Redis/Postgres зависимости.

Минусы:

- больше папок;
- нужно следить за contracts;
- документация должна ясно объяснять разницу.
