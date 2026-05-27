# Monitoring

This directory contains local and production-oriented observability configuration.

## Contents

- `prometheus/prometheus.yml` — scrape targets for service metrics.
- `rules/metrix-alerts.yml` — alerting rules for service and platform health.
- `grafana/` — dashboard and datasource provisioning.
- `logging/` — Loki and Vector configuration for structured logs.

## Rules

- Keep dashboards and alerts versioned with the services they observe.
- Prefer service-level labels that match runtime names in `apps/bot/services`.
- Do not store credentials, datasource passwords, or production endpoints here.
- Update docs when adding new metrics, alerts, or dashboards.
