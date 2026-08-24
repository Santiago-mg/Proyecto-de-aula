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

describe('admin.controller — ban()', () => {
  // Camino 1,2,3,4,5,F — id existente, reason válido
  it('responde con el usuario baneado cuando banUser() resuelve sin error', async () => {
    const bannedUser = { id: 'user-1', banned: true, banReason: 'spam' }
    ;(banUser as ReturnType<typeof vi.fn>).mockResolvedValue(bannedUser)

    const req = { params: { id: 'user-1' }, body: { reason: 'spam' } } as unknown as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    await ban(req, res, next)

    expect(banUser).toHaveBeenCalledWith(expect.anything(), 'user-1', { reason: 'spam' })
    expect(res.json).toHaveBeenCalledWith({ data: bannedUser })
    expect(next).not.toHaveBeenCalled()
  })

  // Camino 1,2,3,4,6,F — banUser() lanza error (ej. id inexistente)
  it('invoca next(error) cuando banUser() lanza un error', async () => {
    const error = new Error('Record not found (P2025)')
    ;(banUser as ReturnType<typeof vi.fn>).mockRejectedValue(error)

    const req = { params: { id: 'no-existe' }, body: { reason: 'spam' } } as unknown as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    await ban(req, res, next)

    expect(next).toHaveBeenCalledWith(error)
    expect(res.json).not.toHaveBeenCalled()
  })
})
