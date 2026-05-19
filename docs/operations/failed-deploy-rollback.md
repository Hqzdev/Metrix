Failed Deploy Rollback Runbook

Этот runbook описывает rollback после неуспешного deploy.

Detection

5xx rate выше alert threshold.
`/ready` возвращает 503.
p95 latency выше SLO.
Ошибки migration или startup в logs.
Пользовательские core flows не проходят.

Immediate actions

1. Остановить rollout.
2. Зафиксировать affected services.
3. Проверить, была ли применена DB migration.
4. Проверить error rate и readiness.
5. Принять решение: rollback app only или incident restore path.

App rollback

App rollback безопасен, если DB change был expand-compatible.

Steps:

1. вернуть предыдущий image или commit
2. оставить expand migration на месте
3. перезапустить affected service
4. проверить `/ready`
5. проверить core flow
6. проверить error rate

DB rollback

DB rollback не делать первым действием.
Если contract migration удалила данные или schema несовместима со старым кодом, открыть incident и использовать DB restore runbook.

Post-rollback verification

1. bot-gateway `/ready`
2. booking-service `/ready`
3. payment-service `/ready`
4. admin-service `/ready`
5. создать или просмотреть test booking flow
6. проверить PaymentSaga recovery queue
7. проверить DLQ streams

Follow-up

1. Записать root cause.
2. Добавить regression test.
3. Обновить migration strategy, если rollback упёрся в schema change.
4. Обновить SLO/error budget burn.

Связанные документы

docs/operations/SLO.md
docs/architecture/ZERO_DOWNTIME_MIGRATIONS.md
docs/operations/db-restore.md
docs/architecture/PRODUCTION_READINESS.md
