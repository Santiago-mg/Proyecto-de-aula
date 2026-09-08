import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { UserRepository } from '../../infrastructure/repositories/UserRepository'

const userRepo = new UserRepository()

interface TokenPayload {
  id: string
  role: string
  iat: number
  exp: number
}

// Extiende el tipo Request de Express para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' })
    return
  }

  const token = authHeader.split(' ')[1]

  let payload: TokenPayload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
    return
  }

  // Un JWT es inmutable hasta que expira: si se banea a alguien o se le cambia
  // el rol después de emitirlo, el token sigue diciendo lo de antes. Por eso se
  // consulta el estado vigente en cada request en lugar de confiar en el payload.
  // Va fuera del try del jwt.verify para que un fallo de base de datos suba como
  // 500 y no se confunda con un token inválido.
  try {
    const user = await userRepo.findById(payload.id)

    if (!user) {
      res.status(401).json({ error: 'Token inválido o expirado' })
      return
    }

    if (user.banned) {
      res.status(403).json({
        error: `Tu cuenta ha sido suspendida.${
          user.banReason ? ` Motivo: ${user.banReason}` : ''
        }`,
      })
      return
    }

    // El rol se toma de la base, no del token: una degradación de ADMIN a USER
    // surte efecto de inmediato sin esperar a que expire la sesión.
    req.user = { ...payload, role: user.role }
    next()
  } catch (error) {
    next(error)
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Acceso restringido a administradores' })
    return
  }
  next()
}
