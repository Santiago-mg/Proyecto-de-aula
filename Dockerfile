# ─────────────────────────────────────────────────────────────────────────────
# Imagen de la API de CelularPro
#
#   docker build -t celularpro-api .
#
# Basada en el Dockerfile.app de Andrés (celular-pro-api). Tiene dos etapas:
#   1. build   → instala todo, compila TypeScript y quita las dependencias de
#                desarrollo.
#   2. runtime → solo lleva lo necesario para correr: dist/ y node_modules de
#                producción (ya con Prisma generado y bcrypt compilado).
#
# Las migraciones se aplican con un contenedor de un solo uso de esta misma
# imagen (lo hace docker-compose.yml del front, servicio "migraciones"):
#   docker run --rm -e DATABASE_URL=... celularpro-api prisma migrate deploy
# ─────────────────────────────────────────────────────────────────────────────

# ─── Etapa 1: compilar ───────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS build

# python3/make/g++: compilan bcrypt (módulo nativo). openssl: lo pide Prisma.
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 make g++ openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# El schema va antes de npm ci porque el postinstall corre `prisma generate`.
# Mientras package*.json y el schema no cambien, Docker reutiliza esta capa.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Deja solo las dependencias de producción. El cliente de Prisma generado
# (node_modules/.prisma) y bcrypt ya compilado se conservan.
RUN npm prune --omit=dev


# ─── Etapa 2: ejecutar ───────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
        openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# CLI de Prisma (misma versión que @prisma/client) para `prisma migrate deploy`.
RUN npm install -g prisma@5.22.0 && npm cache clean --force

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node package.json ./

USER node
EXPOSE 3001

# /health responde sin tocar la base de datos: comprueba que la API está viva.
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3001) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/server.js"]
