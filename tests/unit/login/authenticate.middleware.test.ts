import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { authenticate } from '../../../src/interface/middlewares/auth.middleware'
import { prismaMock } from '../../helpers/prisma-mock'

// Basado en: interface/middlewares/auth.middleware.ts — authenticate()
//
// El middleware no se queda con lo que dice el token: después de verificar la
// firma va a la base a releer el estado vigente del usuario. Así, si a alguien
// lo banean o le bajan el rol, el cambio aplica de inmediato sin esperar a que
// expire la sesión. Por eso es async y por eso hay que simular también la
// consulta a la base.

vi.mock('jsonwebtoken', () => ({
  default: { verify: vi.fn() },
}))

function makeRes() {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res as Response
}

function filaUsuario(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'user@gmail.com',
    name: 'Mario',
    password: 'hashed',
    role: 'USER',
    banned: false,
    banReason: null,
    bannedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('authenticate middleware', () => {
  // Camino 1,2,3,F — sin header Authorization o sin prefijo Bearer
  it('responde 401 "Token requerido" si no hay header Authorization', async () => {
    const req = { headers: {} } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    await authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Token requerido' })
    expect(next).not.toHaveBeenCalled()
  })

  it('responde 401 "Token requerido" si el header no tiene el prefijo Bearer', async () => {
    const req = { headers: { authorization: 'Token abc123' } } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    await authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  // Camino 1,2,4,5,6,7,F — token presente pero inválido o expirado
  it('responde 401 "Token inválido o expirado" si jwt.verify lanza error', async () => {
    ;(jwt.verify as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('jwt expired')
    })
    const req = { headers: { authorization: 'Bearer token-vencido' } } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    await authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado' })
    expect(next).not.toHaveBeenCalled()
  })

  // Firma válida, pero el usuario ya no está en la base
  it('responde 401 si el token es válido pero el usuario ya no existe', async () => {
    ;(jwt.verify as ReturnType<typeof vi.fn>).mockReturnValue({
      id: 'borrado',
      role: 'USER',
      iat: 1,
      exp: 2,
    })
    prismaMock.user.findUnique.mockResolvedValue(null)

    const req = { headers: { authorization: 'Bearer token-valido' } } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    await authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  // Firma válida, pero la cuenta fue suspendida después de emitir el token
  it('responde 403 con el motivo si la cuenta está baneada', async () => {
    ;(jwt.verify as ReturnType<typeof vi.fn>).mockReturnValue({
      id: 'user-1',
      role: 'USER',
      iat: 1,
      exp: 2,
    })
    prismaMock.user.findUnique.mockResolvedValue(
      filaUsuario({ banned: true, banReason: 'fraude en pagos' }),
    )

    const req = { headers: { authorization: 'Bearer token-valido' } } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    await authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      error: expect.stringContaining('fraude en pagos'),
    })
    expect(next).not.toHaveBeenCalled()
  })

  // Camino 1,2,4,5,6,8,9,F — token válido y cuenta activa
  it('asigna req.user y llama a next() si el token es válido', async () => {
    const payload = { id: 'user-1', role: 'USER', iat: 1, exp: 2 }
    ;(jwt.verify as ReturnType<typeof vi.fn>).mockReturnValue(payload)
    prismaMock.user.findUnique.mockResolvedValue(filaUsuario())

    const req = { headers: { authorization: 'Bearer token-valido' } } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    await authenticate(req, res, next)

    expect(req.user).toEqual(payload)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  // El rol se toma de la base, no del token: una degradación de ADMIN a USER
  // surte efecto sin esperar a que la sesión expire.
  it('usa el rol vigente en la base y no el que trae el token', async () => {
    ;(jwt.verify as ReturnType<typeof vi.fn>).mockReturnValue({
      id: 'user-1',
      role: 'ADMIN',
      iat: 1,
      exp: 2,
    })
    prismaMock.user.findUnique.mockResolvedValue(filaUsuario({ role: 'USER' }))

    const req = { headers: { authorization: 'Bearer token-valido' } } as Request
    const next = vi.fn() as NextFunction

    await authenticate(req, makeRes(), next)

    expect(req.user?.role).toBe('USER')
    expect(next).toHaveBeenCalledTimes(1)
  })
})
