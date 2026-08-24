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
