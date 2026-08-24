/**
 * Basado en el diagrama de flujo/grafo:
 *   Proceso 5. Control de roles — Escenario A
 *   Fuente real: src/interface/middlewares/auth.middleware.ts — requireAdmin()
 *
 * Caminos cubiertos:
 *   1,2,3,F -> req.user.role !== 'ADMIN' -> 403 "Acceso restringido a administradores"
 *   1,2,4,F -> req.user.role === 'ADMIN' -> next()
 */
import { describe, it, expect, vi } from 'vitest'
import { requireAdmin } from '../../../src/interface/middlewares/auth.middleware'

function makeRes() {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('requireAdmin() — Middleware de control de rol', () => {
  it("Camino 1,2,3,F — usuario autenticado con rol USER: responde 403", () => {
    const req: any = { user: { id: 'u1', role: 'USER' } }
    const res = makeRes()
    const next = vi.fn()

    requireAdmin(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'Acceso restringido a administradores' })
    expect(next).not.toHaveBeenCalled()
  })

  it('Camino 1,2,4,F — usuario autenticado con rol ADMIN: continúa (next)', () => {
    const req: any = { user: { id: 'u1', role: 'ADMIN' } }
    const res = makeRes()
    const next = vi.fn()

    requireAdmin(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })
})
