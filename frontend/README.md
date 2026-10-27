# CelularPro — Frontend

Tienda de celulares certificados. Carpeta `frontend/` de Proyecto-de-aula-mario; consume su API.

## Stack

- React 18 + **TypeScript** + Vite
- React Router v6
- Axios (cliente HTTP centralizado)
- React Hook Form + Zod (validación)
- Vitest + Testing Library + Chai (pruebas unitarias y de componentes)
- Cypress (componentes, API y regresión)
- axe-core (accesibilidad)
- Serenity/JS + Cucumber + Playwright (pruebas E2E con Screenplay)
- Katalon Recorder (pruebas grabadas)

## Estructura

```
src/
  services/    → Llamadas a la API (cliente HTTP centralizado)
  validation/  → Reglas de credenciales, copia de las del backend
  hooks/       → Lógica reutilizable
  context/     → AuthContext, CartContext, ToastContext
  components/  → UI sin lógica de negocio
  pages/       → Composición de vistas
  types/       → Interfaces TypeScript
  routes/      → AppRouter con rutas protegidas
test/          → Unitarias, fluidas y de regresión (Vitest)
e2e/           → Proyecto aparte: Serenity/JS + Cucumber + Katalon
```

## Configuración

```bash
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:3001/api/v1
npm run dev
```

Sin `.env`, `VITE_API_URL` queda vacío, las peticiones caen en el servidor de
Vite y la pantalla queda en negro. Las variables `VITE_*` se leen al arrancar:
si cambia el `.env`, reinicie Vite.

## Rutas

| Ruta | Descripción | Requiere |
|------|-------------|----------|
| `/` | Inicio | Público |
| `/catalog` | Catálogo con filtros | Público |
| `/phones/:slug` | Detalle de celular | Público |
| `/login` | Iniciar sesión | Público |
| `/register` | Crear cuenta | Público |
| `/dashboard` | Mis pedidos | Usuario |
| `/profile` | Mi perfil: nombre y contraseña | Usuario |
| `/checkout` | Finalizar compra | Usuario |
| `/admin` | Panel con estadísticas y **alertas de stock bajo** | Admin |
| `/admin/phones` | Celulares (stock y stock mínimo en el formulario) | Admin |
| `/admin/orders` | Pedidos | Admin |
| `/admin/users` | Usuarios: roles y suspensiones | Admin |
| `/admin/stats` | Estadísticas | Admin |

## Las seis funcionalidades

| Funcionalidad | Dónde vive |
|---|---|
| Registro de usuario | `pages/Register.tsx`, `AuthContext.register` |
| Inicio de sesión | `pages/Login.tsx`, `AuthContext.login` |
| Gestión de perfil | `pages/Profile.tsx`, `AuthContext.updateProfile` / `changePassword` |
| Validación de credenciales | `validation/credenciales.ts`, interceptor de `services/api.ts` |
| Control de roles | `components/routes/AdminRoute.tsx`, `ProtectedRoute.tsx`, relectura del perfil en `AuthContext` |
| Alerta de stock bajo | `pages/admin/AdminDashboard.tsx`, campo de stock mínimo en `PhoneForm.tsx` |

## Pruebas

Documentación completa por criterio, con objetivo, resultado esperado, resultado
obtenido y evidencia de cada prueba: [`docs/pruebas/README.md`](docs/pruebas/README.md).

| Suite | Herramienta | Pruebas | Comando |
|---|---|---:|---|
| Unitarias y de componentes | Vitest + Testing Library | 111 | `npm run test:unit` |
| Aserciones fluidas | Chai | 12 | `npm run test:fluent` |
| Regresión | Vitest | 9 | `npm run test:regresion` |
| Componentes, API y regresión | Cypress 14 | 45 | `npm run cy:componentes`, `cy:api`, `cy:regresion` |
| E2E Screenplay | Serenity/JS + Cucumber | 26 escenarios | `npm run test:e2e` |
| E2E Katalon | Katalon Recorder | 6 casos | `npm run test:katalon` |
| Accesibilidad | axe-core, WCAG 2.1 AA | 10 pantallas | `npm --prefix e2e run test:accesibilidad` |
| Interfaz | Playwright | 5 casos | `npm --prefix e2e run test:interfaz` |

```bash
npm test                    # Vitest: 132 pruebas
npm run test:evidencia      # igual, guardando el reporte en docs/evidencias/
npm --prefix e2e run evidencias   # E2E, Katalon, accesibilidad e interfaz con evidencia
node scripts/catalogo-pruebas.mjs # regenera docs/pruebas/catalogo-pruebas.md
```

## Deploy

Compatible con Vercel o Netlify. Configure `VITE_API_URL` en la plataforma.
