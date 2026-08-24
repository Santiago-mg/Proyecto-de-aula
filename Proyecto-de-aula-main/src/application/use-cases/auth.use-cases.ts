import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { AppError } from '../../domain/AppError'
import type { IUserRepository } from '../../domain/repositories/IUserRepository'
import type { LoginDto, RegisterDto } from '../dtos/auth.dto'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn']

function signToken(payload: { id: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export async function registerUser(repo: IUserRepository, data: RegisterDto) {
  const exists = await repo.findByEmail(data.email)
  if (exists) throw new AppError('El email ya está registrado', 409)

  const hashedPassword = await bcrypt.hash(data.password, 12)
  const user = await repo.create({ ...data, password: hashedPassword })

  const token = signToken({ id: user.id, role: user.role })
  const { password: _p, ...publicUser } = user
  return { user: publicUser, token }
}

export async function loginUser(repo: IUserRepository, data: LoginDto) {
  const user = await repo.findByEmail(data.email)
  if (!user) throw new AppError('Credenciales inválidas', 401)

  const validPassword = await bcrypt.compare(data.password, user.password)
  if (!validPassword) throw new AppError('Credenciales inválidas', 401)

  // Usuario baneado no puede ingresar
  if ((user as { banned?: boolean }).banned) {
    const reason = (user as { banReason?: string | null }).banReason
    throw new AppError(
      `Tu cuenta ha sido suspendida.${reason ? ` Motivo: ${reason}` : ''}`,
      403,
    )
  }

  const token = signToken({ id: user.id, role: user.role })
  const { password: _p, ...publicUser } = user
  return { user: publicUser, token }
}
