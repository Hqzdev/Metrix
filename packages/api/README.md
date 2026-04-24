# API Package

Это основной backend-слой проекта.

## Что здесь будет

- доменные модули;
- application use cases;
- интеграции с Google, Microsoft и Telegram;
- очереди, realtime и доступ к базе данных;
- общая серверная инфраструктура.

## Основные папки

- `src/modules` — доменные модули
- `src/integrations` — внешние API и адаптеры
- `src/queues` — jobs и workers
- `src/realtime` — realtime-события и транспорт
- `src/shared` — общий backend-код
- `src/database` — доступ к БД и инфраструктурные мапперы
