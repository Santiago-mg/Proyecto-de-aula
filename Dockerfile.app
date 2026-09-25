# syntax=docker/dockerfile:1
#
# Imagen de la API CelularPro.
#
# El `Dockerfile` de la raiz es la imagen del AGENTE de Jenkins (Node, PostgreSQL,
# sonar-scanner, docker-cli). Esta imagen es distinta: solo la aplicacion compilada.
#
#   docker build -f Dockerfile.app -t celular_pro_api:latest .

# ─── Etapa 1: dependencias completas (incluye devDependencies para compilar) ───
FROM node:22-bookworm-slim AS builder

# python3/make/g++ para modulos nativos (bcrypt).
# openssl lo requiere el motor de Prisma.
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
        openssl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# El schema va antes de `npm ci`: el hook `postinstall` ejecuta `prisma generate`
# y falla si no encuentra prisma/schema.prisma.
COPY prisma ./prisma
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Etapa 2: imagen final, solo dependencias de produccion ───
FROM node:22-bookworm-slim AS runner

# openssl:Prisma · curl: diagnostico manual dentro del contenedor
RUN apt-get update && apt-get install -y --no-install-recommends \
        openssl \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000

# --ignore-scripts: el postinstall (`prisma generate`) no puede correr aqui porque
# la CLI de prisma es una devDependency. El cliente generado se copia del builder.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts \
    && npm cache clean --force

# Cliente de Prisma ya generado (contiene los binarios del query engine).
COPY --from=builder /app/node_modules/.prisma      ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Codigo compilado (dist) y schema, necesarios para `prisma migrate deploy`.
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node package.json ./

# CLI de Prisma en la imagen final para poder aplicar migraciones con un
# contenedor efimero:  docker run --rm <img> prisma migrate deploy
# (equivalente a lo que haria `prisma migrate dev` en desarrollo).
RUN npm install -g prisma@5.22.0 \
    && npm cache clean --force

USER node

EXPOSE 8000

# /health responde sin tocar la base de datos, asi que el HEALTHCHECK mide que el
# proceso de Node esta vivo y escuchando.
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
    CMD node -e "require('http').get({host:'127.0.0.1',port:process.env.PORT||8000,path:'/health',timeout:4000},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/server.js"]
