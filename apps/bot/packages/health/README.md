# @metrix/health

Shared health-check primitives for bot microservices.

## Responsibility

This package owns reusable readiness/health behavior:

- PostgreSQL connectivity checks;
- Redis connectivity checks;
- dependency latency measurement;
- JSON health result shape;
- optional HTTP `/health` handler helpers.

Services decide which dependencies are required and where to expose health endpoints. This package only runs checks and formats the result.

## Structure

- `checks.ts`: individual dependency checks.
- `runner.ts`: combines dependency checks into one result.
- `http.ts`: HTTP handler and request matcher helpers.
- `types.ts`: shared health result types.
- `index.ts`: package root exports.

## Public API

```ts
import {
  handleHealthCheck,
  isHealthCheckRequest,
  runHealthChecks,
} from '@metrix/health'
```

### `runHealthChecks(options)`

Returns a JSON-ready health result without writing to HTTP. Use this when a service already has its own router.

### `handleHealthCheck(res, options)`

Writes an HTTP response:

- `200` when all provided dependencies are healthy;
- `503` when at least one provided dependency fails.

### `isHealthCheckRequest(req)`

Matches `GET /health` so services can bypass auth for infrastructure probes.

## Microservice Boundary

`@metrix/health` is infrastructure-level shared code. It should not know service-specific routes, auth policy, metrics, or logging. Keep service-specific readiness decisions in each service and pass only the dependencies that matter for that process.
