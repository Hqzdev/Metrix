Architecture Decisions

Этот раздел хранит ADR.

ADR — это короткая запись важного архитектурного решения.

Зачем нужны ADR

Через месяц никто не помнит, почему выбрали Redis, HMAC или отдельный bot runtime.
ADR сохраняет причину.

Формат

- Context — какая была проблема.
- Decision — что решили.
- Consequences — что это меняет.

Документы

- 0001 — Redis для shared runtime state.
- 0002 — HMAC для service-to-service auth.
- 0003 — разделение web и bot runtime.
