Load Testing Results

Эта папка предназначена для результатов нагрузочного тестирования.

Ожидаемые артефакты

k6 scripts
Artillery scenarios
raw output logs
summary reports
latency screenshots

Первый обязательный сценарий

Проверить конкурентное бронирование одного слота.
Ожидаемый результат: только один запрос получает успешный booking или hold, остальные получают контролируемый отказ.

Шаблон результата

```
Date:
Commit:
Tool:
Scenario:
Duration:
Virtual users:
p50:
p95:
p99:
Error rate:
Conclusion:
```
