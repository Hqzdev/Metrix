API Package

Это основной backend-слой проекта.

Что здесь есть

packages/api содержит:

* контракты API
* validation для входных данных
* JWT/session auth helpers
* Prisma repository для бронирований
* use-case безопасного создания бронирования
* Redis/BullMQ очереди для calendar sync и reminders
* WebSocket hub для availability updates
* event-driven события бронирований
* mapper для ресурсов, слотов и локаций

Основные папки

src/modules — доменные модули
src/integrations — внешние API и адаптеры
src/queues — jobs и workers
src/realtime — realtime-события и transport
src/shared — общий backend-код
src/database — доступ к БД и инфраструктурные мапперы

Документация

backend-data.md — backend/data блок, Prisma, auth, validation и contracts
queues-realtime.md — Redis, BullMQ, events и WebSocket availability
