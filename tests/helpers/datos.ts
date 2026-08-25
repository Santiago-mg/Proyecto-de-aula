import { Prisma } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { prismaMock } from './prisma-mock'

/** Ids fijos para que las pruebas sean legibles y reproducibles. */
export const ID_ADMIN = '11111111-1111-1111-1111-111111111111'
export const ID_USUARIO = '22222222-2222-2222-2222-222222222222'
export const ID_INEXISTENTE = '00000000-0000-0000-0000-000000000000'
export const ID_CELULAR = '33333333-3333-3333-3333-333333333333'

type Rol = 'USER' | 'ADMIN'

/** Fila de usuario tal como la devolvería Prisma. */
export function filaUsuario(cambios: Partial<Record<string, unknown>> = {}) {
  return {
    id: ID_USUARIO,
    email: 'prueba@correo.com',
    name: 'Usuario de prueba',
    password: 'hash-irrelevante-para-estas-pruebas',
    role: 'USER' as Rol,
    banned: false,
    banReason: null as string | null,
    bannedAt: null as Date | null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    _count: { orders: 0 },
    ...cambios,
  }
}

/** Fila de celular con todas las relaciones que incluye phoneInclude. */
export function filaCelular(cambios: Partial<Record<string, unknown>> = {}) {
  return {
    id: ID_CELULAR,
    slug: 'iphone-15-prueba',
    name: 'iPhone 15 de prueba',
    brand: 'Apple',
    categoryId: 'apple',
    price: 4200000,
    compareAt: null,
    badge: null,
    stock: 5,
    condition: 'CERTIFIED',
    verified: true,
    batteryHealth: 95,
    ram: '6GB',
    storage: '128GB',
    camera: '48MP',
    battery: '3349mAh',
    screen: '6.1"',
    chip: 'A16 Bionic',
    shortDesc: 'Celular certificado de prueba',
    longDesc: null,
    heroImage: null,
    images: [],
    colors: [],
    features: [],
    category: { name: 'Apple' },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...cambios,
  }
}

/** Body mínimo que aprueba createPhoneDto. */
export function bodyCelularValido(cambios: Record<string, unknown> = {}) {
  return {
    slug: 'celular-nuevo-de-prueba',
    name: 'Celular nuevo de prueba',
    brand: 'Samsung',
    categoryId: 'samsung',
    price: 1500000,
    stock: 3,
    condition: 'CERTIFIED',
    ...cambios,
  }
}

/**
 * Deja el sistema listo para que auth.middleware autentique al usuario dado y
 * devuelve el token que hay que mandar en la cabecera.
 *
 * El middleware no confía en el rol del token: lo relee de la base en cada
 * request. Por eso hay que simular también el findUnique que hace por dentro.
 */
export function autenticarComo(
  opciones: { id?: string; role?: Rol; banned?: boolean; banReason?: string } = {},
): string {
  const { id = ID_ADMIN, role = 'ADMIN', banned = false, banReason } = opciones

  prismaMock.user.findUnique.mockResolvedValue(
    filaUsuario({ id, role, banned, banReason: banReason ?? null }),
  )

  return jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
    expiresIn: '1h',
  })
}

/** Token con firma que no corresponde al JWT_SECRET del servidor. */
export function tokenConFirmaInvalida(): string {
  return jwt.sign({ id: ID_ADMIN, role: 'ADMIN' }, 'secreto-equivocado')
}

/** El error que lanza Prisma cuando un update o delete no encuentra la fila. */
export function errorRegistroNoEncontrado(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    'An operation failed because it depends on one or more records that were required but not found.',
    { code: 'P2025', clientVersion: '5.22.0' },
  )
}

/** Respuestas de Prisma que necesita getStats() para completar sin fallar. */
export function simularEstadisticas(pedidos: {
  groupBy?: unknown[]
  recientes?: unknown[]
  ultimos7Dias?: unknown[]
  ingresoDelMes?: number | null
}) {
  const {
    groupBy = [],
    recientes = [],
    ultimos7Dias = [],
    ingresoDelMes = null,
  } = pedidos

  // Conteos de usuarios: se distinguen por el filtro que recibe cada llamada.
  prismaMock.user.count.mockImplementation(async (args?: any) => {
    if (args?.where?.banned) return 2
    if (args?.where?.createdAt) return 3
    if (args?.where?.role === 'ADMIN') return 1
    return 10
  })

  prismaMock.phone.count.mockImplementation(async (args?: any) => {
    if (args?.where?.stock) return 8
    if (args?.where?.verified) return 6
    return 9
  })

  prismaMock.order.groupBy.mockResolvedValue(groupBy)
  prismaMock.order.aggregate.mockResolvedValue({ _sum: { total: ingresoDelMes } })

  // order.findMany se llama dos veces con propósitos distintos: la lista de
  // pedidos recientes usa `take`, y la de ingresos por día usa `select`.
  prismaMock.order.findMany.mockImplementation(async (args?: any) =>
    args?.select ? ultimos7Dias : recientes,
  )
}
