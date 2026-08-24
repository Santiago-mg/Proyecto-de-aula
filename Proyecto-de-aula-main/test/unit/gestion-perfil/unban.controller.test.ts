import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

// Basado en: interface/controllers/admin.controller.ts — unban()
//          + application/use-cases/admin.use-cases.ts — unbanUser()

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

import { unban } from '../../../src/interface/controllers/admin.controller'
import { unbanUser } from '../../../src/application/use-cases/admin.use-cases'

function makeRes() {
  const res: Partial<Response> = {}
  res.json = vi.fn().mockReturnValue(res)
  return res as Response
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('admin.controller — unban()', () => {
  // Camino 1,2,3,4,5,F — id existente y baneado
  it('responde con el usuario desbaneado cuando unbanUser() resuelve sin error', async () => {
    const unbannedUser = { id: 'user-1', banned: false, banReason: null, bannedAt: null }
    ;(unbanUser as ReturnType<typeof vi.fn>).mockResolvedValue(unbannedUser)

    const req = { params: { id: 'user-1' } } as unknown as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    await unban(req, res, next)

    expect(unbanUser).toHaveBeenCalledWith(expect.anything(), 'user-1')
    expect(res.json).toHaveBeenCalledWith({ data: unbannedUser })
    expect(next).not.toHaveBeenCalled()
  })

  // Camino 1,2,3,4,6,F — unbanUser() lanza error (ej. id inexistente)
  it('invoca next(error) cuando unbanUser() lanza un error', async () => {
    const error = new Error('Record not found (P2025)')
    ;(unbanUser as ReturnType<typeof vi.fn>).mockRejectedValue(error)

    const req = { params: { id: 'no-existe' } } as unknown as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    await unban(req, res, next)

    expect(next).toHaveBeenCalledWith(error)
    expect(res.json).not.toHaveBeenCalled()
  })
})
