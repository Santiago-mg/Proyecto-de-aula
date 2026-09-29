# CelularPro API

API REST para tienda de celulares certificados. Resuelve la desconfianza en el mercado de celulares usados mediante inspección técnica verificada.

## Stack

- Node.js + Express + **TypeScript**
- PostgreSQL + **Prisma ORM**
- JWT + bcrypt
- Zod (validación)

## Arquitectura — Clean Architecture

```
src/
  domain/         → Entidades e interfaces (sin dependencias externas)
  application/    → Casos de uso + DTOs de validación
  infrastructure/ → Prisma + implementaciones de repositorios
  interface/      → Controladores, rutas, middlewares
```

## Configuración

### 1. Instalar dependencias
```bash
npm install
```

### 2. Variables de entorno
```bash
cp .env.example .env
# Editar .env con tus valores reales
```

Variables requeridas:

| Variable | Descripción |
|----------|-------------|
| DATABASE_URL | URL de conexión PostgreSQL |
| JWT_SECRET | Clave secreta para firmar tokens |
| JWT_EXPIRES_IN | Duración del token (ej: 7d) |
| PORT | Puerto del servidor (default: 3001) |
| FRONTEND_URL | URL del frontend para CORS |

### 3. Base de datos
```bash
npx prisma migrate dev --name init
npm run db:seed
```

### 4. Iniciar
```bash
npm run dev
```

## Pruebas

```bash
npm test                # suite completa: tests/unit + tests/escenarios
npm run test:coverage   # + cobertura en coverage/ (la lee SonarQube)
npm run typecheck       # tipos de src/ y de tests/
```

No necesitan base de datos: usan un doble de Prisma.

## Docker

```bash
docker build -t celularpro-api:latest .
```

La imagen trae la CLI de Prisma, así que
`docker run --rm -e DATABASE_URL=... celularpro-api prisma migrate deploy`
aplica las migraciones. La app completa (base, API y front) se levanta con el
`docker-compose.yml` del repositorio del front.

## Integración continua (Jenkins)

El `Jenkinsfile` corre dentro del agente de `Dockerfile.jenkins`:

Entorno → Instalar dependencias → Typecheck → Pruebas y cobertura →
SonarQube (análisis + Quality Gate) → Build → Imagen Docker

Este job no despliega. El despliegue (Docker y Vercel) lo hace el orquestador
del repositorio del front, y solo si el back y el front pasan. Configuración
paso a paso: [DEVOPS.md](https://github.com/Santiago-mg/Proyecto-de-aula-front/blob/main/DEVOPS.md).

## Endpoints

- POST /api/v1/auth/register
- POST /api/v1/auth/login
- GET  /api/v1/auth/me  (token)
- GET  /api/v1/phones          (filtros: page, limit, category, brand, condition, verified, search)
- GET  /api/v1/phones/id/:id  (por UUID — uso interno admin)
- GET  /api/v1/phones/:slug
- POST /api/v1/phones   (admin)
- PUT  /api/v1/phones/:id (admin)
- DELETE /api/v1/phones/:id (admin)
- POST /api/v1/orders   (usuario)
- GET  /api/v1/orders/my (usuario)
- GET  /api/v1/orders   (admin)
- PUT  /api/v1/orders/:id/status (admin)

## Admin por defecto (después del seed)

Email: admin@celularpro.co
Pass:  admin1234
