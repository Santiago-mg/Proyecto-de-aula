import { expect } from 'chai'
import { describe, it, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { unban } from '../../../src/interface/controllers/admin.controller'
import { prismaMock } from '../../helpers/prisma-mock'
import {
  ID_INEXISTENTE,
  errorRegistroNoEncontrado,
  usuarioConConteo,
} from '../../helpers/fixtures'

// Basado en: interface/controllers/admin.controller.ts — unban()
//          + application/use-cases/admin.use-cases.ts — unbanUser()
//
// unban() usa el AdminRepository real del módulo: solo se sustituye el
// cliente Prisma.

function makeRes() {
  const res: Partial<Response> = {}
  res.json = vi.fn().mockReturnValue(res)
  return res as Response
}

describe('admin.controller — unban()', () => {
  // Camino 1,2,3,4,5,F — id existente y baneado
  it('responde con el usuario desbaneado cuando unbanUser() resuelve sin error', async () => {
    // Arrange
    const victima = usuarioConConteo()
    prismaMock.user.update.mockResolvedValue(victima)

    const req = { params: { id: victima.id } } as unknown as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    // Act
    await unban(req, res, next)

    // Assert
    const cuerpo = vi.mocked(res.json).mock.calls[0][0]
    expect(cuerpo, 'respuesta del controlador').to.have.all.keys('data')
    expect(cuerpo.data).to.include({
      id: victima.id,
      banned: false,
      banReason: null,
      bannedAt: null,
    })
    expect(vi.mocked(next).mock.calls).to.be.empty
  })

  // Camino 1,2,3,4,6,F — unbanUser() lanza error (id inexistente)
  it('invoca next(error) cuando el id no existe', async () => {
    // Arrange
    prismaMock.user.update.mockRejectedValue(errorRegistroNoEncontrado())

    const req = { params: { id: ID_INEXISTENTE } } as unknown as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    // Act
    await unban(req, res, next)

    // Assert
    const [error] = vi.mocked(next).mock.calls[0]
    expect(error).to.include({ message: 'Usuario no encontrado', statusCode: 404 })
    expect(vi.mocked(res.json).mock.calls).to.be.empty
  })
})
