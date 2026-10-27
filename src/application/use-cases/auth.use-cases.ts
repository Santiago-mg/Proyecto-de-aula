import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { AppError } from '../../domain/AppError'
import type { User } from '../../domain/entities/User'
import type { IUserRepository } from '../../domain/repositories/IUserRepository'
import type {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  UpdateProfileDto,
} from '../dtos/auth.dto'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn']
/**
 * Costo de bcrypt para las contraseñas NUEVAS (registro y cambio). Las ya
 * guardadas se verifican con el costo con que se crearon.
 *
 * 12 por defecto. Cada punto duplica el tiempo: en 1 vCPU, costo 12 limita el
 * login a ~4 por segundo y costo 10 a ~16 (ver docs/pruebas/
 * seguridad-rendimiento.md). OWASP recomienda 10 como mínimo, por eso no se
 * acepta un valor menor.
 */
export function costoBcrypt(): number {
  return Math.min(14, Math.max(10, Number(process.env.BCRYPT_COST) || 12))
}

/**
 * Hash bcrypt real (coste 12) de un texto que nadie usa como contraseña.
 *
 * Cuando el correo no existe, loginUser compara igual contra este hash. Sin
 * eso, un correo inexistente respondía al instante y uno existente tardaba lo
 * que tarda bcrypt (~250 ms): midiendo el tiempo de respuesta se podía saber
 * qué correos tienen cuenta, aunque el mensaje de error sea el mismo.
 */
const HASH_SEÑUELO =
  '$2b$12$jS2E9giotc927zJ9nvDUxuC2LyhAFvy4B3ADVOcvRL5kF5wJAvOg.'

function signToken(payload: { id: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

function toPublicUser(user: User) {
  const { password: _p, ...publicUser } = user
  return publicUser
}

// registerUser y loginUser terminaban igual: firmar el token y quitarle la
// password al usuario antes de devolverlo.
function buildAuthResponse(user: User) {
  const token = signToken({ id: user.id, role: user.role })
  return { user: toPublicUser(user), token }
}

// ─── Registro de usuario ─────────────────────────────────────────────────

export async function registerUser(repo: IUserRepository, data: RegisterDto) {
  const exists = await repo.findByEmail(data.email)
  if (exists) throw new AppError('El email ya está registrado', 409)

  const hashedPassword = await bcrypt.hash(data.password, costoBcrypt())
  const user = await repo.create({ ...data, password: hashedPassword })

  return buildAuthResponse(user)
}

// ─── Inicio de sesión ────────────────────────────────────────────────────

export async function loginUser(repo: IUserRepository, data: LoginDto) {
  const user = await repo.findByEmail(data.email)

  // Se compara siempre, exista o no el usuario, para que el tiempo de
  // respuesta no delate qué correos están registrados.
  const validPassword = await bcrypt.compare(
    data.password,
    user?.password ?? HASH_SEÑUELO,
  )
  if (!user || !validPassword) {
    throw new AppError('Credenciales inválidas', 401)
  }

  // Usuario baneado no puede ingresar. Se comprueba después de la contraseña
  // para no revelar a un tercero que la cuenta existe y está suspendida.
  if (user.banned) {
    throw new AppError(
      `Tu cuenta ha sido suspendida.${
        user.banReason ? ` Motivo: ${user.banReason}` : ''
      }`,
      403,
    )
  }

  return buildAuthResponse(user)
}

// ─── Gestión de perfil ───────────────────────────────────────────────────

// El JWT solo carga `id` y `role`. Para /me hay que ir a la base, si no el
// endpoint devuelve el payload del token (id, role, iat, exp) en lugar del
// perfil, y el front nunca recibe `name` ni `email`.
export async function getProfile(repo: IUserRepository, userId: string) {
  const user = await repo.findById(userId)
  if (!user) throw new AppError('Usuario no encontrado', 404)
  return toPublicUser(user)
}

export async function updateProfile(
  repo: IUserRepository,
  userId: string,
  data: UpdateProfileDto,
) {
  const user = await repo.update(userId, { name: data.name })
  return toPublicUser(user)
}

export async function changePassword(
  repo: IUserRepository,
  userId: string,
  data: ChangePasswordDto,
) {
  const user = await repo.findById(userId)
  if (!user) throw new AppError('Usuario no encontrado', 404)

  const currentOk = await bcrypt.compare(data.currentPassword, user.password)
  // 400 y no 401: la sesión es válida, lo que está mal es un dato del
  // formulario. Un 401 haría que el frontend cerrara la sesión del usuario.
  if (!currentOk) {
    throw new AppError('La contraseña actual no es correcta', 400)
  }

  const hashedPassword = await bcrypt.hash(data.newPassword, costoBcrypt())
  await repo.update(userId, { password: hashedPassword })
}
