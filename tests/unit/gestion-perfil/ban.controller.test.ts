import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

// Basado en: interface/controllers/admin.controller.ts — ban()
//          + application/use-cases/admin.use-cases.ts — banUser()

vi.mock('../../../src/infrastructure/repositories/AdminRepository', () => ({
  AdminRepository: vi.fn(),
}))

vi.mock('../../../src/application/use-cases/admin.use-cases', () => ({
  banUser: vi.fn(),
  unbanUser: vi.fn(),
  changeUserRole: vi.fn(),
  getStats: vi.fn(),
  listUsers: vi.fn(),
}))

import { ban } from '../../../src/interface/controllers/admin.controller'
import { banUser } from '../../../src/application/use-cases/admin.use-cases'

function makeRes() {
  const res: Partial<Response> = {}
  res.json = vi.fn().mockReturnValue(res)
  return res as Response
}

beforeEach(() => {
  vi.clearAllMocks()
})

// El controlador toma el id del administrador que hace la petición desde el
// token ya verificado (req.user), y se lo pasa al caso de uso como cuarto
// argumento para que pueda aplicar la regla RN-05 (nadie se banea a sí mismo).
function makeReq(id: string, requesterId = 'admin-1') {
  return {
    params: { id },
    body: { reason: 'spam' },
    user: { id: requesterId, role: 'ADMIN', iat: 1, exp: 2 },
  } as unknown as Request
}

describe('admin.controller — ban()', () => {
  // Camino 1,2,3,4,5,F — id existente, reason válido
  it('responde con el usuario baneado cuando banUser() resuelve sin error', async () => {
    const bannedUser = { id: 'user-1', banned: true, banReason: 'spam' }
    ;(banUser as ReturnType<typeof vi.fn>).mockResolvedValue(bannedUser)

    const req = makeReq('user-1')
    const res = makeRes()
    const next = vi.fn() as NextFunction

    await ban(req, res, next)

    expect(banUser).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      { reason: 'spam' },
      'admin-1',
    )
    expect(res.json).toHaveBeenCalledWith({ data: bannedUser })
    expect(next).not.toHaveBeenCalled()
  })

  // Camino 1,2,3,4,6,F — banUser() lanza error (ej. id inexistente)
  it('invoca next(error) cuando banUser() lanza un error', async () => {
    const error = new Error('Usuario no encontrado')
    ;(banUser as ReturnType<typeof vi.fn>).mockRejectedValue(error)

    const req = makeReq('no-existe')
    const res = makeRes()
    const next = vi.fn() as NextFunction

    await ban(req, res, next)

    expect(next).toHaveBeenCalledWith(error)
    expect(res.json).not.toHaveBeenCalled()
  })

  it('le pasa al caso de uso el id del admin que hace la petición', async () => {
    ;(banUser as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'user-9' })

    const req = makeReq('user-9', 'otro-admin')
    await ban(req, makeRes(), vi.fn() as NextFunction)

    expect(banUser).toHaveBeenCalledWith(
      expect.anything(),
      'user-9',
      expect.anything(),
      'otro-admin',
    )
  })
})
