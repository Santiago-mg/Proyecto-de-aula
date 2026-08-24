/**
 * Basado en el diagrama de flujo/grafo:
 *   Proceso 3. Gestión de perfil — Escenario A
 *   Fuente real: src/interface/controllers/admin.controller.ts — ban()
 *                src/application/use-cases/admin.use-cases.ts — banUser()
 *
 * El controlador instancia `new AdminRepository()` a nivel de módulo, así que
 * se mockea esa clase ANTES de importar el controlador para no tocar Prisma.
 *
 * Caminos cubiertos:
 *   1,2,3,4,5,F -> banUser() resuelve       -> res.json({ data: user })
 *   1,2,3,4,6,F -> banUser() lanza error    -> catch(error) -> next(error)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const banUserMock = vi.fn()

vi.mock('../../../src/infrastructure/repositories/AdminRepository', () => ({
  AdminRepository: class {
    banUser = banUserMock
  },
}))

function makeRes() {
  const res: any = {}
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('ban() — Controlador de baneo de usuario (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Camino 1,2,3,4,5,F — banUser() resuelve sin error: responde con el usuario baneado', async () => {
    const { ban } = await import('../../../src/interface/controllers/admin.controller')
    const bannedUser = { id: 'u1', banned: true, banReason: 'Spam' }
    banUserMock.mockResolvedValue(bannedUser)

    const req: any = { params: { id: 'u1' }, body: { reason: 'Spam' } }
    const res = makeRes()
    const next = vi.fn()

    await ban(req, res, next)

    expect(res.json).toHaveBeenCalledWith({ data: bannedUser })
    expect(next).not.toHaveBeenCalled()
  })

  it('Camino 1,2,3,4,6,F — banUser() lanza error: invoca next(error), no responde', async () => {
    const { ban } = await import('../../../src/interface/controllers/admin.controller')
    const error = new Error('Registro no encontrado')
    banUserMock.mockRejectedValue(error)

    const req: any = { params: { id: 'id-inexistente' }, body: { reason: 'Spam' } }
    const res = makeRes()
    const next = vi.fn()

    await ban(req, res, next)

    expect(next).toHaveBeenCalledWith(error)
    expect(res.json).not.toHaveBeenCalled()
  })
})
