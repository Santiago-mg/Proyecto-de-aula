import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import prisma from '../../src/infrastructure/database/prisma'

/**
 * Fixtures reales para la suite sin mocks.
 *
 * Nada de esto simula nada: crearUsuario() hace un INSERT real con bcrypt de
 * verdad, generarToken() firma un JWT de verdad. Cada función admite un
 * `sufijo` o genera uno al azar para que dos pruebas que corren en el mismo
 * archivo nunca choquen por un email o un slug repetido (email y slug son
 * columnas @unique en el schema).
 */

function sufijoUnico(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Id con formato UUID que nunca existe en la base: útil para probar 404. */
export const ID_INEXISTENTE = '00000000-0000-0000-0000-000000000000'

type Rol = 'USER' | 'ADMIN'

interface OpcionesUsuario {
  email?: string
  name?: string
  password?: string
  role?: Rol
  banned?: boolean
  banReason?: string | null
}

/** Crea un usuario real en la base. La contraseña se guarda hasheada con bcrypt, tal como lo hace registerUser(). */
export async function crearUsuario(opciones: OpcionesUsuario = {}) {
  const {
    email = `usuario-${sufijoUnico()}@correo.com`,
    name = 'Usuario de prueba',
    password = 'password123',
    role = 'USER',
    banned = false,
    banReason = null,
  } = opciones

  const hashedPassword = await bcrypt.hash(password, 12)

  return prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role,
      banned,
      banReason,
      bannedAt: banned ? new Date() : null,
    },
  })
}

/** Firma un JWT real, igual que signToken() en auth.use-cases.ts. */
export function generarToken(user: { id: string; role: string }): string {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET as string, {
    expiresIn: '1h',
  })
}

/** Token con una firma que no corresponde al JWT_SECRET del servidor: sirve para probar el camino de "firma inválida". */
export function tokenConFirmaInvalida(): string {
  return jwt.sign({ id: ID_INEXISTENTE, role: 'ADMIN' }, 'secreto-equivocado')
}

/** Crea un admin real y devuelve la fila junto con un token ya listo para el header Authorization. */
export async function crearAdminAutenticado(opciones: OpcionesUsuario = {}) {
  const user = await crearUsuario({ ...opciones, role: 'ADMIN' })
  return { user, token: generarToken(user) }
}

/** Igual que crearAdminAutenticado(), pero con rol USER. */
export async function crearUsuarioAutenticado(opciones: OpcionesUsuario = {}) {
  const user = await crearUsuario({ ...opciones, role: 'USER' })
  return { user, token: generarToken(user) }
}

/** Categoría mínima: Phone.categoryId es una llave foránea real hacia Category. */
export async function crearCategoria(id = 'apple') {
  return prisma.category.upsert({
    where: { id },
    update: {},
    create: { id, name: id.charAt(0).toUpperCase() + id.slice(1) },
  })
}

interface OpcionesCelular {
  slug?: string
  name?: string
  brand?: string
  categoryId?: string
  price?: number
  stock?: number
  condition?: 'NEW' | 'CERTIFIED' | 'USED'
  verified?: boolean
}

/** Crea un celular real. Crea también su categoría si todavía no existe, porque la llave foránea la exige. */
export async function crearCelular(opciones: OpcionesCelular = {}) {
  const {
    slug = `celular-${sufijoUnico()}`,
    name = 'Celular de prueba',
    brand = 'Apple',
    categoryId = 'apple',
    price = 1_500_000,
    stock = 5,
    condition = 'CERTIFIED',
    verified = true,
  } = opciones

  await crearCategoria(categoryId)

  return prisma.phone.create({
    data: { slug, name, brand, categoryId, price, stock, condition, verified },
  })
}

/** Body mínimo que aprueba createPhoneDto, para ESC-30. La categoría "samsung" debe crearse antes con crearCategoria('samsung'). */
export function bodyCelularValido(cambios: Record<string, unknown> = {}) {
  return {
    slug: `celular-nuevo-${sufijoUnico()}`,
    name: 'Celular nuevo de prueba',
    brand: 'Samsung',
    categoryId: 'samsung',
    price: 1_500_000,
    stock: 3,
    condition: 'CERTIFIED',
    ...cambios,
  }
}
