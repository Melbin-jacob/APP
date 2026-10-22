#!/bin/sh
set -e
# Apply migrations (idempotent), optionally load demo data, then serve.
npx prisma migrate deploy
if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  npx tsx prisma/seed.ts
fi
exec npx next start -p "${PORT:-3000}"
