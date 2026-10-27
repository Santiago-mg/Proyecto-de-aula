# CelularPro API

API REST de la tienda de celulares certificados CelularPro. El frontend está en
`frontend/` y consume esta API.

## Stack

- Node.js + Express + **TypeScript**
- PostgreSQL + **Prisma ORM**
- JWT + bcrypt
- Zod (validación)
- Vitest + Supertest + Chai (pruebas)

## Arquitectura — Clean Architecture

```
src/
  domain/         → Entidades, reglas de negocio puras e interfaces
  application/    → Casos de uso + DTOs de validación
  infrastructure/ → Prisma + implementaciones de repositorios
  interface/      → Controladores, rutas, middlewares
```

## Las seis funcionalidades

| Funcionalidad | Dónde vive | Endpoints |
|---|---|---|
| Registro de usuario | `auth.use-cases.ts` → `registerUser` | `POST /auth/register` |
| Inicio de sesión | `auth.use-cases.ts` → `loginUser` | `POST /auth/login` |
| Gestión de perfil | `auth.use-cases.ts` → `getProfile`, `updateProfile`, `changePassword` | `GET /auth/me`, `PATCH /auth/me`, `PUT /auth/me/password` |
| Validación de credenciales | `domain/credenciales.ts` + `auth.dto.ts` + `auth.middleware.ts` | Todas las anteriores |
| Control de roles | `requireAdmin` + `admin.use-cases.ts` | `/admin/*`, `PUT /admin/users/:id/role` |
| Alerta de stock bajo | `domain/stock-alerts.ts` + `repositories/stock-alerts.ts` | `GET /admin/alerts` (se generan al comprar o editar un celular) |

### Reglas de credenciales

Están en `src/domain/credenciales.ts` y el frontend tiene una copia en
`src/validation/credenciales.ts`. Las suites de regresión de ambos proyectos
fijan los mismos valores, así que si una regla cambia en un solo lado, una de
ellas falla.

- El correo se guarda y se busca en minúsculas y sin espacios.
- Para registrarse, el dominio debe ser gmail.com, outlook.com, hotmail.com,
  yahoo.com o icloud.com. El login no exige dominio (la cuenta del seed es
  `admin@celularpro.co`).
- Contraseña: de 8 a 72 caracteres, con al menos una minúscula, una mayúscula
  y un número. El límite de 72 se debe a que bcrypt ignora lo que sigue.
- El login responde lo mismo, y tarda lo mismo, si el correo no existe o si la
  contraseña es incorrecta: así no se puede averiguar qué correos tienen cuenta.

## Configuración

```bash
npm install
cp .env.example .env      # completar con los valores reales
npx prisma migrate dev
npm run db:seed
npm run dev
```

| Variable | Descripción |
|----------|-------------|
| DATABASE_URL | URL de conexión PostgreSQL |
| JWT_SECRET | Clave secreta para firmar tokens |
| JWT_EXPIRES_IN | Duración del token (ej: 7d) |
| PORT | Puerto del servidor (default: 3001) |
| FRONTEND_URL | URL del frontend para CORS |

Cuenta de administrador después del seed: `admin@celularpro.co` / `admin1234`.
Esa contraseña no cumple la política actual (se creó antes); sirve para
ingresar, pero conviene cambiarla desde el perfil en cualquier entorno compartido.

## Endpoints

Todos bajo `/api/v1`.

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/auth/register` | Público |
| POST | `/auth/login` | Público |
| GET | `/auth/me` | Usuario |
| PATCH | `/auth/me` | Usuario — cambia el nombre |
| PUT | `/auth/me/password` | Usuario — `{ currentPassword, newPassword }`, responde 204 |
| GET | `/phones` | Público (filtros: page, limit, category, brand, condition, verified, search) |
| GET | `/phones/:slug` | Público |
| GET | `/phones/:slug/similares` | Público |
| GET | `/phones/id/:id` | Admin |
| POST / PUT / DELETE | `/phones`, `/phones/:id` | Admin |
| POST | `/orders` | Usuario |
| GET | `/orders/my` | Usuario |
| GET | `/orders` | Admin |
| PUT | `/orders/:id/status` | Admin |
| GET / POST / DELETE | `/favorites`, `/favorites/:phoneId` | Usuario |
| GET | `/admin/stats` | Admin |
| GET | `/admin/users` | Admin |
| GET | `/admin/alerts` | Admin |
| PUT | `/admin/users/:id/ban`, `/unban`, `/role` | Admin |

## Pruebas

**Rúbrica (los cinco criterios desde esta carpeta):** `npm run instalar` una vez y
luego `npm run criterio1` … `npm run criterio5`. Índice: [`docs/pruebas/README.md`](docs/pruebas/README.md).

Documentación por criterio, con objetivo, resultado esperado, resultado obtenido
y evidencia de cada prueba: [`docs/pruebas/README.md`](docs/pruebas/README.md).

418 pruebas, 100% de cobertura de líneas, ramas y funciones. No necesitan base
de datos: el cliente Prisma se sustituye por un doble. Detalle técnico en
[`tests/README.md`](tests/README.md).

```bash
npm test                 # toda la suite
npm run test:coverage    # + reporte para SonarQube
npm run test:seguridad   # controles de seguridad
npm run test:carga       # carga con autocannon (~1 minuto) → docs/evidencias/rendimiento/
npm run test:evidencia   # suite + reporte JSON en docs/evidencias/unitarias/
npm run typecheck        # tipos de src/ y de tests/
```

## Seguridad en producción

| Variable | Por defecto | Uso |
|---|---|---|
| `LOGIN_MAX_INTENTOS` | 5 | Intentos fallidos por cuenta antes de responder 429 |
| `LOGIN_MAX_INTENTOS_IP` | 50 | Intentos fallidos por IP (sobre cualquier cuenta) |
| `LOGIN_VENTANA_MS` | 900000 | Ventana del limitador (15 minutos) |
| `TRUST_PROXY` | (sin definir) | `true` detrás de un proxy (Vercel, Nginx) para que el limitador vea la IP real |
| `BCRYPT_COST` | 12 | Costo para contraseñas nuevas (10 a 14). Ver el análisis de carga |

## Herramientas de pruebas con IA

ReportPortal (reportes y análisis de fallos) y Momentic (contrato de la API) están integrados. Ver
[`HERRAMIENTAS-IA.md`](HERRAMIENTAS-IA.md).
