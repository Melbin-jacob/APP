# Self-contained image for local testing and simple deployments.
# Keeps dev dependencies so the container can run migrations and the seed.
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate && npx next build

ENV NODE_ENV=production PORT=3000
EXPOSE 3000
ENTRYPOINT ["sh", "docker/entrypoint.sh"]
