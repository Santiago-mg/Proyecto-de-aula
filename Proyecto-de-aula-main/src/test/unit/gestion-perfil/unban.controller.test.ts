/**
 * Basado en el diagrama de flujo/grafo:
 *   Proceso 3. Gestión de perfil — Escenario B
 *   Fuente real: src/interface/controllers/admin.controller.ts — unban()
 *                src/application/use-cases/admin.use-cases.ts — unbanUser()
 *
 * Caminos cubiertos:
 *   1,2,3,4,5,F -> unbanUser() resuelve    -> res.json({ data: user })
 *   1,2,3,4,6,F -> unbanUser() lanza error -> catch(error) -> next(error)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const unbanUserMock = vi.fn()

vi.mock('../../../src/infrastructure/repositories/AdminRepository', () => ({
  AdminRepository: class {
    unbanUser = unbanUserMock
  },
}))

function makeRes() {
  const res: any = {}
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('unban() — Controlador de desbaneo de usuario (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Camino 1,2,3,4,5,F — unbanUser() resuelve sin error: responde con el usuario desbaneado', async () => {
    const { unban } = await import('../../../src/interface/controllers/admin.controller')
    const unbannedUser = { id: 'u1', banned: false, banReason: null }
    unbanUserMock.mockResolvedValue(unbannedUser)

    const req: any = { params: { id: 'u1' } }
    const res = makeRes()
    const next = vi.fn()

    await unban(req, res, next)

    expect(res.json).toHaveBeenCalledWith({ data: unbannedUser })
    expect(next).not.toHaveBeenCalled()
  })

  it('Camino 1,2,3,4,6,F — unbanUser() lanza error: invoca next(error), no responde', async () => {
    const { unban } = await import('../../../src/interface/controllers/admin.controller')
    const error = new Error('Registro no encontrado')
    unbanUserMock.mockRejectedValue(error)

    const req: any = { params: { id: 'id-inexistente' } }
    const res = makeRes()
    const next = vi.fn()

    await unban(req, res, next)

    expect(next).toHaveBeenCalledWith(error)
    expect(res.json).not.toHaveBeenCalled()
  })
})
