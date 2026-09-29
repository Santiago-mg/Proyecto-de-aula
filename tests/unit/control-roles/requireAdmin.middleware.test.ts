import { expect } from 'chai'
import { describe, it, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { requireAdmin } from '../../../src/interface/middlewares/auth.middleware'

// Basado en: interface/middlewares/auth.middleware.ts — requireAdmin()

function makeRes() {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res as Response
}

describe('requireAdmin middleware', () => {
  // Camino 1,2,3,F — usuario autenticado con rol USER
  it('responde 403 y bloquea el acceso si el usuario no es ADMIN', () => {
    // Arrange
    const req = { user: { id: 'u1', role: 'USER', iat: 1, exp: 2 } } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    // Act
    requireAdmin(req, res, next)

    // Assert
    expect(vi.mocked(res.status).mock.calls).to.deep.include([403])
    expect(vi.mocked(res.json).mock.calls).to.deep.include([{ error: 'Acceso restringido a administradores' }])
    expect(vi.mocked(next).mock.calls).to.be.empty
  })

  // Camino 1,2,4,F — usuario autenticado con rol ADMIN
  it('llama a next() si el usuario tiene rol ADMIN', () => {
    // Arrange
    const req = { user: { id: 'u1', role: 'ADMIN', iat: 1, exp: 2 } } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    // Act
    requireAdmin(req, res, next)

    // Assert
    expect(vi.mocked(next).mock.calls).to.have.lengthOf(1)
    expect(vi.mocked(res.status).mock.calls).to.be.empty
  })
})
