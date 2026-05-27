# Traefik

This directory contains reverse proxy configuration for local and deployable
service routing.

## Contents

- `traefik.yml` — static Traefik configuration.
- `dynamic/middlewares.yml` — reusable middleware for headers, rate limits, and proxy behavior.

## Rules

- Keep route and middleware names aligned with service names.
- Put reusable security and rate-limit behavior in `dynamic/middlewares.yml`.
- Do not commit real certificates, tokens, or production-only host secrets.
- Document new public routes in `docs/architecture/DEPLOYMENT.md`.
