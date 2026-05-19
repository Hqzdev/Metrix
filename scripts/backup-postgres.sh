#!/usr/bin/env sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-backups/postgres}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT_FILE="${BACKUP_DIR}/metrix-${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

pg_dump "${DATABASE_URL}" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="${OUTPUT_FILE}"

echo "Postgres backup written to ${OUTPUT_FILE}"
