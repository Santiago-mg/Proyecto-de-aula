# CelularPro — Frontend

Tienda de celulares certificados. Compra equipos nuevos, reacondicionados y usados verificados con garantía real.

## Stack

- React 18 + **TypeScript**
- Vite
- React Router v6
- Axios (cliente HTTP centralizado)
- React Hook Form + Zod (validación)
- Lucide React (iconos)

## Estructura

```
src/
  services/    → Llamadas a la API (cliente HTTP centralizado)
  hooks/       → Lógica reutilizable
  context/     → AuthContext, CartContext, ToastContext
  components/  → UI pura sin lógica de negocio
  pages/       → Composición de vistas
  types/       → Interfaces TypeScript
  routes/      → AppRouter con rutas protegidas
```

## Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env
```

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL del backend (ej: `https://tu-api.onrender.com/api/v1`) |

### 3. Iniciar

```bash
npm run dev
```

### 4. Build para producción

```bash
npm run build
```

## Rutas

| Ruta | Descripción | Requiere |
|------|-------------|----------|
| `/` | Home | Público |
| `/catalog` | Catálogo con filtros | Público |
| `/phones/:slug` | Detalle de celular | Público |
| `/login` | Iniciar sesión | Público |
| `/register` | Crear cuenta | Público |
| `/dashboard` | Mis órdenes | Usuario |
| `/checkout` | Finalizar compra | Usuario |
| `/admin/phones` | Panel de celulares | Admin |
| `/admin/phones/new` | Crear celular | Admin |
| `/admin/phones/:id/edit` | Editar celular | Admin |

## Deploy

Compatible con **Vercel** o **Netlify**.

```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod --dir=dist
```

Configurar la variable `VITE_API_URL` en la plataforma de deploy.
