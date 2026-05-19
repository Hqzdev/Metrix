Screenshots

Эта папка хранит скриншоты для testing evidence.

Правило именования

web-dashboard.png
web-booking.png
web-analytics.png
mobile-booking.png
mobile-resource.png
telegram-start.png
telegram-booking-flow.png
telegram-payment.png
telegram-admin.png
docker-compose-ps.png
health-checks.png
metrics.png
prometheus-targets.png
prometheus-alerts.png
grafana-overview.png
grafana-service-latency.png
logs-vector-output.png
metrics-endpoint-admin-service.png
metrics-endpoint-booking-service.png
metrics-endpoint-payment-service.png
metrics-endpoint-notification-service.png

Правило добавления

Скриншот должен показывать проверенный сценарий, а не просто красивый экран.
Если скриншот относится к тесту, в docs/testing/README.md рядом должна быть указана команда, дата или сценарий проверки.

Observability screenshots

Для production readiness нужны реальные скриншоты:

Prometheus targets
Prometheus alerts
Grafana overview dashboard
Grafana service latency panel
Vector или другой logs viewer с JSON logs
/metrics endpoint для admin-service
/metrics endpoint для booking-service
/metrics endpoint для payment-service
/metrics endpoint для notification-service

Не добавлять placeholder screenshots.
Если monitoring stack не поднят, статус остаётся planned.
