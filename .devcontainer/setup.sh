#!/usr/bin/env bash
# Writes .env for this container, installs deps, migrates and seeds.
set -euo pipefail

if [ -n "${CODESPACE_NAME:-}" ]; then
  # Codespaces serves port 3000 at a public https URL; auth and the CSRF
  # origin check must use that URL, not localhost.
  APP_URL="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
else
  APP_URL="http://localhost:3000"
fi

cat > .env <<ENV
DATABASE_URL="postgresql://postgres:postgres@db:5432/homeservices?schema=public"
REDIS_URL="redis://redis:6379"
APP_URL="${APP_URL}"
NEXTAUTH_URL="${APP_URL}"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
REVIEW_TOKEN_PEPPER="$(openssl rand -hex 32)"
REVIEW_TOKEN_TTL_DAYS="14"
CRON_SECRET="$(openssl rand -hex 32)"
EMAIL_TRANSPORT="smtp"
SMTP_URL="smtp://mailpit:1025"
EMAIL_FROM="HomeServices Direct <no-reply@homeservices.test>"
ENV

npm ci
npx prisma migrate deploy
npm run db:seed
echo "Ready. App: ${APP_URL}  ·  Inbox: port 8025 (Ports tab)"
