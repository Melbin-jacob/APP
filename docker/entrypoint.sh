#!/bin/sh
set -e
# Apply migrations (idempotent), optionally load demo data, then serve.
# Retry while the database finishes starting (slow first boot, emulation on
# Apple Silicon); give up after about 2 minutes.
i=0
until npx prisma migrate deploy; do
  i=$((i+1))
  if [ "$i" -ge 24 ]; then echo "Database still unreachable, giving up." >&2; exit 1; fi
  echo "Database not ready yet, retrying in 5s ($i/24)..."
  sleep 5
done
if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  npx tsx prisma/seed.ts
fi
exec npx next start -p "${PORT:-3000}"
