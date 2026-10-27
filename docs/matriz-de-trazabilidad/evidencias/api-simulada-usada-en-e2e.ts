import { randomUUID } from 'node:crypto'
import http from 'node:http'
import { z } from './zod-del-front'
import {
  emailLoginSchema,
  emailRegistroSchema,
  nombreSchema,
  normalizarEmail,
  passwordSchema,
} from '../../src/validation/credenciales'

/**
 * API simulada de CelularPro para el modo E2E por defecto.
 *
 * Implementa SOLO los endpoints que recorren las seis funcionalidades, con
 * los mismos códigos de estado, mensajes y reglas que el backend real
 * (Proyecto-de-aula-mario-v2). Las reglas de credenciales no se copian: se
 * importan de src/validation/credenciales.ts, que la suite de regresión
 * mantiene alineado con el backend.
 *
 * No reemplaza las pruebas del backend: sirve para que las E2E del frontend
 * corran sin Postgres. Para probar la integración completa, usar el modo real
 * (ver README de e2e/).
 */

type Rol = 'USER' | 'ADMIN'

interface Usuario {
  id: string
  email: string
  name: string
  password: string
  role: Rol
  banned: boolean
  banReason: string | null
  bannedAt: string | null
  createdAt: string
  updatedAt: string
}

interface Celular {
  id: string
  slug: string
  name: string
  brand: string
  categoryId: string
  category: string
  price: number
  compareAt: number | null
  badge: string | null
  stock: number
  minStock: number
  condition: 'NEW' | 'CERTIFIED' | 'USED'
  verified: boolean
  batteryHealth: number | null
  ram: string | null
  storage: string | null
  camera: string | null
  battery: string | null
  screen: string | null
  chip: string | null
  shortDesc: string | null
  longDesc: string | null
  heroImage: string | null
  images: unknown[]
  colors: unknown[]
  features: string[]
  createdAt: string
  updatedAt: string
}

interface Alerta {
  id: string
  phoneId: string
  type: 'LOW_STOCK' | 'OUT_OF_STOCK'
  message: string
  isResolved: boolean
  createdAt: string
}

class ErrorHttp extends Error {
  constructor(
    public status: number,
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message)
  }
}

// ─── Estado ──────────────────────────────────────────────────────────────
// AGREGADO: contadores del límite de intentos de inicio de sesión (por correo normalizado)
const fallosLogin = new Map<string, { fallos: number; desde: number }>()

const estado = {
  usuarios: new Map<string, Usuario>(),
  sesiones: new Map<string, string>(), // token → userId
  celulares: new Map<string, Celular>(),
  alertas: [] as Alerta[],
}

function ahora() {
  return new Date().toISOString()
}

function crearUsuario(datos: Pick<Usuario, 'email' | 'name' | 'password'> & { role?: Rol }): Usuario {
  const usuario: Usuario = {
    id: randomUUID(),
    email: normalizarEmail(datos.email),
    name: datos.name,
    password: datos.password,
    role: datos.role ?? 'USER',
    banned: false,
    banReason: null,
    bannedAt: null,
    createdAt: ahora(),
    updatedAt: ahora(),
  }
  estado.usuarios.set(usuario.id, usuario)
  return usuario
}

/** Deja la API como recién sembrada: el admin y los celulares del seed. */
export function resetearApiSimulada(): void {
  fallosLogin.clear()
  estado.usuarios.clear()
  estado.sesiones.clear()
  estado.celulares.clear()
  estado.alertas = []

  crearUsuario({
    email: 'admin@celularpro.co',
    name: 'Administrador CelularPro',
    password: 'admin1234',
    role: 'ADMIN',
  })

  // Mismos slugs, nombres y stock que src/infrastructure/database/seed-data.json
  const seed: Array<[string, string, string, number, number]> = [
    ['iphone-15-pro-max', 'iPhone 15 Pro Max', 'Apple', 1_299_000, 15],
    ['iphone-14', 'iPhone 14', 'Apple', 799_000, 8],
    ['samsung-galaxy-s24-ultra', 'Samsung Galaxy S24 Ultra', 'Samsung', 1_249_000, 12],
    ['iphone-13-usado', 'iPhone 13 (Usado)', 'Apple', 549_000, 5],
  ]
  for (const [slug, name, brand, price, stock] of seed) {
    const id = randomUUID()
    const categoria = brand.toLowerCase()
    estado.celulares.set(id, {
      id, slug, name, brand, categoryId: categoria, category: categoria, price,
      compareAt: null, badge: null, stock, minStock: 5,
      condition: slug.endsWith('usado') ? 'USED' : 'NEW', verified: true, batteryHealth: null,
      ram: null, storage: null, camera: null, battery: null, screen: null, chip: null,
      shortDesc: null, longDesc: null, heroImage: null, images: [], colors: [], features: [],
      createdAt: ahora(), updatedAt: ahora(),
    })
  }
}

// ─── Reglas copiadas del dominio del backend (src/domain/stock-alerts.ts) ─

function evaluarAlerta(stock: number, minStock: number): Alerta['type'] | null {
  if (stock <= 0) return 'OUT_OF_STOCK'
  if (stock <= minStock) return 'LOW_STOCK'
  return null
}

function mensajeAlerta(tipo: Alerta['type'], nombre: string, stock: number, minStock: number) {
  if (tipo === 'OUT_OF_STOCK') return `"${nombre}" se quedó sin unidades.`
  return `"${nombre}" tiene ${stock} ${stock === 1 ? 'unidad' : 'unidades'}, en o por debajo del mínimo de ${minStock}.`
}

function sincronizarAlertas(celular: Celular) {
  const tipo = evaluarAlerta(celular.stock, celular.minStock)
  for (const a of estado.alertas) {
    if (a.phoneId === celular.id && !a.isResolved && a.type !== tipo) a.isResolved = true
  }
  if (!tipo) return
  const mensaje = mensajeAlerta(tipo, celular.name, celular.stock, celular.minStock)
  const existente = estado.alertas.find((a) => a.phoneId === celular.id && a.type === tipo)
  if (existente) {
    Object.assign(existente, { message: mensaje, isResolved: false, createdAt: ahora() })
  } else {
    estado.alertas.push({
      id: randomUUID(),
      phoneId: celular.id,
      type: tipo,
      message: mensaje,
      isResolved: false,
      createdAt: ahora(),
    })
  }
}

// ─── Validación (mismo formato de error que validate.middleware) ────────

const registerDto = z.object({ email: emailRegistroSchema, name: nombreSchema, password: passwordSchema })
const loginDto = z.object({ email: emailLoginSchema, password: z.string().min(1, 'La contraseña es requerida') })
const updateProfileDto = z.object({ name: nombreSchema })
const changePasswordDto = z
  .object({ currentPassword: z.string().min(1), newPassword: passwordSchema })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'La nueva contraseña debe ser distinta de la actual',
    path: ['newPassword'],
  })

function validar<T>(schema: z.ZodType<T>, body: unknown): T {
  const r = schema.safeParse(body)
  if (!r.success) {
    throw new ErrorHttp(400, 'Datos inválidos', {
      errors: r.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    })
  }
  return r.data
}

// ─── Autenticación (misma lógica que auth.middleware) ───────────────────

function publico(u: Usuario) {
  const { password: _p, ...resto } = u
  return resto
}

function iniciarSesion(u: Usuario) {
  const token = `simulado.${randomUUID()}`
  estado.sesiones.set(token, u.id)
  return { user: publico(u), token }
}

function mensajeSuspension(u: Usuario) {
  return `Tu cuenta ha sido suspendida.${u.banReason ? ` Motivo: ${u.banReason}` : ''}`
}

function autenticar(req: http.IncomingMessage): Usuario {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) throw new ErrorHttp(401, 'Token requerido')
  const userId = estado.sesiones.get(header.slice(7))
  const usuario = userId ? estado.usuarios.get(userId) : undefined
  if (!usuario) throw new ErrorHttp(401, 'Token inválido o expirado')
  if (usuario.banned) throw new ErrorHttp(403, mensajeSuspension(usuario))
  return usuario
}

function requerirAdmin(req: http.IncomingMessage): Usuario {
  const u = autenticar(req)
  if (u.role !== 'ADMIN') throw new ErrorHttp(403, 'Acceso restringido a administradores')
  return u
}

function usuarioAdmin(u: Usuario) {
  return { ...publico(u), orderCount: 0 }
}

function buscarUsuario(id: string): Usuario {
  const u = estado.usuarios.get(id)
  if (!u) throw new ErrorHttp(404, 'Usuario no encontrado')
  return u
}

// ─── Rutas ───────────────────────────────────────────────────────────────

type Respuesta = { status: number; body?: unknown }

async function enrutar(
  metodo: string,
  ruta: string,
  query: URLSearchParams,
  body: unknown,
  req: http.IncomingMessage,
): Promise<Respuesta> {
  let m: RegExpMatchArray | null

  // Registro de usuario
  if (metodo === 'POST' && ruta === '/auth/register') {
    const datos = validar(registerDto, body)
    if ([...estado.usuarios.values()].some((u) => u.email === datos.email)) {
      throw new ErrorHttp(409, 'El email ya está registrado')
    }
    return { status: 201, body: { data: iniciarSesion(crearUsuario(datos)) } }
  }

  // Inicio de sesión
  if (metodo === 'POST' && ruta === '/auth/login') {
    const datos = validar(loginDto, body)
    // ── AGREGADO: límite de intentos, igual que login-limiter.middleware.ts del backend real
    //    (5 fallos por cuenta en 15 minutos → 429; un login correcto reinicia el contador) ──
    const VENTANA_MS = 15 * 60 * 1000
    const ahoraMs = Date.now()
    const c = fallosLogin.get(datos.email)
    if (c && ahoraMs - c.desde >= VENTANA_MS) fallosLogin.delete(datos.email)
    const vigente = fallosLogin.get(datos.email)
    if (vigente && vigente.fallos >= 5) {
      const minutos = Math.max(1, Math.ceil((VENTANA_MS - (ahoraMs - vigente.desde)) / 60_000))
      throw new ErrorHttp(429, `Demasiados intentos fallidos. Intenta de nuevo en ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}.`)
    }
    const u = [...estado.usuarios.values()].find((x) => x.email === datos.email)
    if (!u || u.password !== datos.password) {
      if (vigente) vigente.fallos += 1
      else fallosLogin.set(datos.email, { fallos: 1, desde: ahoraMs })
      throw new ErrorHttp(401, 'Credenciales inválidas')
    }
    if (u.banned) throw new ErrorHttp(403, mensajeSuspension(u))
    fallosLogin.delete(datos.email)
    return { status: 200, body: { data: iniciarSesion(u) } }
  }

  // Gestión de perfil
  if (ruta === '/auth/me' && metodo === 'GET') {
    return { status: 200, body: { data: publico(autenticar(req)) } }
  }
  if (ruta === '/auth/me' && metodo === 'PATCH') {
    const u = autenticar(req)
    const { name } = validar(updateProfileDto, body)
    Object.assign(u, { name, updatedAt: ahora() })
    return { status: 200, body: { data: publico(u) } }
  }
  if (ruta === '/auth/me/password' && metodo === 'PUT') {
    const u = autenticar(req)
    const datos = validar(changePasswordDto, body)
    if (u.password !== datos.currentPassword) {
      throw new ErrorHttp(400, 'La contraseña actual no es correcta')
    }
    u.password = datos.newPassword
    return { status: 204 }
  }

  // Control de roles — panel de administración
  if (metodo === 'GET' && ruta === '/admin/stats') {
    requerirAdmin(req)
    const usuarios = [...estado.usuarios.values()]
    const celulares = [...estado.celulares.values()]
    const enStock = celulares.filter((c) => c.stock > 0).length
    return {
      status: 200,
      body: {
        data: {
          users: {
            total: usuarios.length,
            banned: usuarios.filter((u) => u.banned).length,
            newThisWeek: usuarios.length,
            admins: usuarios.filter((u) => u.role === 'ADMIN').length,
          },
          phones: { total: celulares.length, inStock: enStock, outOfStock: celulares.length - enStock, verified: 0 },
          orders: {
            total: 0, pending: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0,
            revenue: 0, revenueThisMonth: 0,
          },
          revenueByDay: [],
          recentOrders: [],
        },
      },
    }
  }

  if (metodo === 'GET' && ruta === '/admin/users') {
    requerirAdmin(req)
    const page = Number(query.get('page') ?? 1)
    const limit = Number(query.get('limit') ?? 20)
    const search = (query.get('search') ?? '').toLowerCase()
    const todos = [...estado.usuarios.values()]
      .filter((u) => !search || u.name.toLowerCase().includes(search) || u.email.includes(search))
      .reverse()
    return {
      status: 200,
      body: {
        data: todos.slice((page - 1) * limit, page * limit).map(usuarioAdmin),
        meta: { total: todos.length, page, limit, totalPages: Math.ceil(todos.length / limit) },
      },
    }
  }

  if (metodo === 'PUT' && (m = ruta.match(/^\/admin\/users\/([^/]+)\/(role|ban|unban)$/))) {
    const admin = requerirAdmin(req)
    const [, id, accion] = m
    const datos = (body ?? {}) as { role?: string; reason?: string }
    if (accion === 'role') {
      if (datos.role !== 'USER' && datos.role !== 'ADMIN') {
        throw new ErrorHttp(400, 'Datos inválidos', { errors: [{ field: 'role', message: 'Rol inválido' }] })
      }
      if (id === admin.id) throw new ErrorHttp(400, 'No puedes cambiar tu propio rol')
      const u = buscarUsuario(id)
      u.role = datos.role
      return { status: 200, body: { data: usuarioAdmin(u) } }
    }
    if (accion === 'ban') {
      if (!datos.reason || datos.reason.length < 4) {
        throw new ErrorHttp(400, 'Datos inválidos', {
          errors: [{ field: 'reason', message: 'El motivo debe tener al menos 4 caracteres' }],
        })
      }
      if (id === admin.id) throw new ErrorHttp(400, 'No puedes banear tu propia cuenta')
      const u = buscarUsuario(id)
      Object.assign(u, { banned: true, banReason: datos.reason, bannedAt: ahora() })
      return { status: 200, body: { data: usuarioAdmin(u) } }
    }
    const u = buscarUsuario(id)
    Object.assign(u, { banned: false, banReason: null, bannedAt: null })
    return { status: 200, body: { data: usuarioAdmin(u) } }
  }

  // Alertas de stock bajo
  if (metodo === 'GET' && ruta === '/admin/alerts') {
    requerirAdmin(req)
    const abiertas = estado.alertas
      .filter((a) => !a.isResolved)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((a) => {
        const c = estado.celulares.get(a.phoneId)!
        return {
          ...a,
          phone: { id: c.id, name: c.name, slug: c.slug, stock: c.stock, minStock: c.minStock, heroImage: c.heroImage },
        }
      })
    return { status: 200, body: { data: abiertas } }
  }

  if (metodo === 'PUT' && (m = ruta.match(/^\/phones\/([^/]+)$/))) {
    requerirAdmin(req)
    const c = estado.celulares.get(m[1])
    if (!c) throw new ErrorHttp(404, 'Celular no encontrado')
    const datos = (body ?? {}) as Partial<Pick<Celular, 'stock' | 'minStock'>>
    if (datos.stock !== undefined) c.stock = datos.stock
    if (datos.minStock !== undefined) c.minStock = datos.minStock
    sincronizarAlertas(c)
    return { status: 200, body: { data: c } }
  }

  // ── AGREGADO para ejecutar las E2E de alertas (no estaba en la versión del equipo) ──
  // Replica createPhone del backend real (src/application/use-cases/phones.use-cases.ts):
  // solo administradores, slug único (409), minStock por defecto 5 y alertas sincronizadas.
  if (metodo === 'POST' && ruta === '/phones') {
    requerirAdmin(req)
    const d = (body ?? {}) as Partial<Celular> & { category?: string }
    if (!d.name || !d.slug || !d.brand || d.price === undefined || d.stock === undefined) {
      throw new ErrorHttp(400, 'Datos inválidos')
    }
    if ([...estado.celulares.values()].some((c) => c.slug === d.slug)) {
      throw new ErrorHttp(409, 'Ya existe un celular con ese slug')
    }
    const c: Celular = {
      id: randomUUID(), slug: d.slug, name: d.name, brand: d.brand,
      categoryId: d.categoryId ?? d.category ?? 'samsung', category: d.category ?? d.categoryId ?? 'samsung',
      price: Number(d.price), compareAt: d.compareAt ?? null, badge: d.badge ?? null,
      stock: Number(d.stock), minStock: d.minStock === undefined ? 5 : Number(d.minStock),
      condition: d.condition ?? 'NEW', verified: d.verified ?? false, batteryHealth: d.batteryHealth ?? null,
      ram: d.ram ?? null, storage: d.storage ?? null, camera: d.camera ?? null, battery: d.battery ?? null,
      screen: d.screen ?? null, chip: d.chip ?? null, shortDesc: d.shortDesc ?? null, longDesc: d.longDesc ?? null,
      heroImage: d.heroImage ?? null, images: [], colors: [], features: [], createdAt: ahora(), updatedAt: ahora(),
    }
    estado.celulares.set(c.id, c)
    sincronizarAlertas(c)
    return { status: 201, body: { data: c } }
  }

  if (metodo === 'GET' && ruta === '/phones') {
    const lista = [...estado.celulares.values()]
    return {
      status: 200,
      body: { data: lista, meta: { total: lista.length, page: 1, limit: 50, totalPages: 1 } },
    }
  }

  if (metodo === 'GET' && (m = ruta.match(/^\/phones\/id\/([^/]+)$/))) {
    requerirAdmin(req)
    const c = estado.celulares.get(m[1])
    if (!c) throw new ErrorHttp(404, 'Celular no encontrado')
    return { status: 200, body: { data: c } }
  }

  if (metodo === 'GET' && (m = ruta.match(/^\/phones\/([^/]+)$/)) && m[1] !== 'id') {
    const c = [...estado.celulares.values()].find((x) => x.slug === m![1])
    if (!c) throw new ErrorHttp(404, 'Celular no encontrado')
    return { status: 200, body: { data: c } }
  }

  // Lo que el frontend pide al pasar por otras páginas (inicio, mis pedidos):
  // listas vacías con la forma que espera.
  if (metodo === 'GET' && ruta === '/orders/my') {
    autenticar(req)
    return { status: 200, body: { data: [] } }
  }
  if (metodo === 'GET') {
    return { status: 200, body: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } } }
  }

  throw new ErrorHttp(404, 'Ruta no encontrada')
}

// ─── Servidor HTTP ───────────────────────────────────────────────────────

function leerCuerpo(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let datos = ''
    req.on('data', (chunk) => (datos += chunk))
    req.on('end', () => {
      if (!datos) return resolve(undefined)
      try {
        resolve(JSON.parse(datos))
      } catch {
        reject(new ErrorHttp(400, 'El cuerpo de la petición no es un JSON válido'))
      }
    })
  })
}

let servidor: http.Server | undefined

export function iniciarApiSimulada(puerto: number): Promise<void> {
  resetearApiSimulada()
  servidor = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end()
      return
    }

    const url = new URL(req.url ?? '/', 'http://localhost')
    const ruta = url.pathname.replace(/^\/api\/v1/, '')
    try {
      const body = await leerCuerpo(req)
      const r = await enrutar(req.method ?? 'GET', ruta, url.searchParams, body, req)
      if (r.body === undefined) {
        res.writeHead(r.status).end()
      } else {
        res.writeHead(r.status, { 'Content-Type': 'application/json' }).end(JSON.stringify(r.body))
      }
    } catch (error) {
      const e = error instanceof ErrorHttp ? error : new ErrorHttp(500, 'Error interno del servidor')
      res
        .writeHead(e.status, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: e.message, ...e.extra }))
    }
  })
  return new Promise((resolve) => servidor!.listen(puerto, resolve))
}

export function detenerApiSimulada(): Promise<void> {
  return new Promise((resolve) => (servidor ? servidor.close(() => resolve()) : resolve()))
}
