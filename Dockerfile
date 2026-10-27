# ─────────────────────────────────────────────────────────────────────────────
# Imagen de la API de CelularPro (celularpro-api)
#
# La usa docker-compose.yml del frontend en dos servicios:
#   migraciones → prisma migrate deploy && node dist/infrastructure/database/seed.js
#   api         → node dist/server.js  (puerto 3001, HEALTHCHECK en /health)
# ─────────────────────────────────────────────────────────────────────────────

# ── Etapa 1: compilar ────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS build
WORKDIR /app
# Prisma necesita OpenSSL para elegir su motor de consultas
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
# El postinstall corre `prisma generate` (ya está el esquema copiado)
RUN npm ci --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Solo dependencias de producción + el CLI de prisma, que el servicio
# `migraciones` necesita para `prisma migrate deploy`.
RUN PRISMA_VERSION="$(node -p "require('./node_modules/prisma/package.json').version")" \
    && npm prune --omit=dev --no-audit --no-fund \
    && npm install --no-save --no-audit --no-fund "prisma@${PRISMA_VERSION}" \
    && npx prisma generate

# ── Etapa 2: ejecutar ────────────────────────────────────────────────────────
FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3001 \
    PATH="/app/node_modules/.bin:${PATH}"

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/package.json ./package.json

USER node
EXPOSE 3001

# El orquestador de Jenkins espera "healthy" antes de seguir
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=12 \
    CMD node -e "fetch('http://127.0.0.1:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
