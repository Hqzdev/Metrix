Audit Log Policy

Этот документ объясняет audit log.

Что такое audit log

Это журнал важных действий.

Он отвечает на вопросы:

- кто сделал действие;
- когда сделал;
- через какой сервис;
- над какой сущностью;
- с каким requestId.

Что писать в audit

- создание брони;
- отмену брони;
- payment recovery;
- DLQ replay;
- admin updates;
- forbidden/security events.

Что не писать

- пароли;
- refresh tokens;
- полные секреты;
- лишние персональные данные.

Зачем нужен requestId

requestId помогает связать HTTP-запрос, лог и audit event.

Retention

Старые audit events можно удалять по политике retention.
Security incidents стоит хранить до ручного закрытия review.
