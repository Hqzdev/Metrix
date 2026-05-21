Load Testing

Этот документ объясняет нагрузочное тестирование.

Зачем оно нужно

Обычные тесты показывают, что код работает.
Load tests показывают, как система ведет себя под нагрузкой.

Что нужно измерять

- p50 latency;
- p95 latency;
- p99 latency;
- error rate;
- throughput;
- CPU/memory;
- database connection behavior;
- Redis latency.

Главный сценарий

Concurrent booking:

много пользователей пытаются бронировать один или несколько слотов.

Что пока не закрыто

Реальные p95/p99/error rate еще не сняты.

Статус: planned.
