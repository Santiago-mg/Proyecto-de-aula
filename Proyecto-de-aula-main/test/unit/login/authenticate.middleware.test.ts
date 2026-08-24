import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { authenticate } from '../../../src/interface/middlewares/auth.middleware'

// Basado en: interface/middlewares/auth.middleware.ts — authenticate()

vi.mock('jsonwebtoken', () => ({
  default: { verify: vi.fn() },
}))

function makeRes() {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res as Response
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('authenticate middleware', () => {
  // Camino 1,2,3,F — sin header Authorization o sin prefijo Bearer
  it('responde 401 "Token requerido" si no hay header Authorization', () => {
    const req = { headers: {} } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Token requerido' })
    expect(next).not.toHaveBeenCalled()
  })

  it('responde 401 "Token requerido" si el header no tiene el prefijo Bearer', () => {
    const req = { headers: { authorization: 'Token abc123' } } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  // Camino 1,2,4,5,6,7,F — token presente pero inválido o expirado
  it('responde 401 "Token inválido o expirado" si jwt.verify lanza error', () => {
    ;(jwt.verify as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('jwt expired')
    })
    const req = { headers: { authorization: 'Bearer token-vencido' } } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado' })
    expect(next).not.toHaveBeenCalled()
  })

  // Camino 1,2,4,5,6,8,9,F — token válido
  it('asigna req.user y llama a next() si el token es válido', () => {
    const payload = { id: 'user-1', role: 'USER', iat: 1, exp: 2 }
    ;(jwt.verify as ReturnType<typeof vi.fn>).mockReturnValue(payload)
    const req = { headers: { authorization: 'Bearer token-valido' } } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    authenticate(req, res, next)

    expect(req.user).toEqual(payload)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })
})
