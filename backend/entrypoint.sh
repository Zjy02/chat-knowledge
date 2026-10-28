#!/bin/sh
set -eu

# MySQL can accept TCP connections slightly after its container is "healthy".
# Retry the migration a few times instead of crash-looping the API container.
attempt=1
while [ "$attempt" -le 30 ]; do
  if alembic upgrade head; then
    break
  fi
  echo "waiting for database / migration attempt ${attempt}/30..."
  attempt=$((attempt + 1))
  sleep 2
done

if [ "$attempt" -gt 30 ]; then
  echo "database migration failed after 30 attempts" >&2
  exit 1
fi

if [ "${SEED_DEMO:-false}" = "true" ]; then
  echo "seeding demo data..."
  python -m app.scripts.seed || echo "demo seed skipped/failed (non-fatal)"
fi

exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 1 \
  --proxy-headers \
  --forwarded-allow-ips='*'
