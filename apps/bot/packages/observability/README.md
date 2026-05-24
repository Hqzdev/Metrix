# @metrix/observability

Shared observability primitives for bot microservices.

## Responsibility

This package owns reusable process-level observability helpers:

- in-memory Prometheus metrics registry;
- HTTP request latency and request count instrumentation;
- `/metrics` response helper;
- readiness response helper;
- normalized route labels for metrics;
- graceful shutdown signal handling.

Services still own their business logs, domain metrics, readiness checks, and which routes expose observability endpoints.

## Structure

- `metrics-registry.ts`: counters, gauges, HTTP histogram storage, and Prometheus rendering.
- `http.ts`: observed HTTP handler wrapper, metrics response, readiness response.
- `shutdown.ts`: graceful shutdown lifecycle helper.
- `routes.ts`: route normalization for low-cardinality metrics labels.
- `format.ts`: Prometheus label/key formatting helpers.
- `types.ts`: logger and metric value types.
- `constants.ts`: shared timeout and latency bucket constants.
- `index.ts`: package root exports.

## Public API

```ts
import {
  MetricsRegistry,
  createObservedHandler,
  installGracefulShutdown,
  sendMetrics,
  sendReadiness,
} from '@metrix/observability'
```

### Metrics

Create one `MetricsRegistry` per service process:

```ts
const metrics = new MetricsRegistry('booking-service')
```

Wrap HTTP handlers with `createObservedHandler` to record request count and duration. Use `sendMetrics` to expose Prometheus text format.

### Readiness

`sendReadiness` runs service-provided async checks and returns:

- `200` when all checks pass;
- `503` when any check fails.

### Shutdown

`installGracefulShutdown` listens for `SIGTERM` and `SIGINT`, closes the HTTP server first, then service resources in order.

## Microservice Boundary

`@metrix/observability` is infrastructure-level shared code. It should not import service code, know service routes, or decide which dependencies are mandatory. Pass service-specific checks, resources, and loggers into the package from each service entrypoint.
