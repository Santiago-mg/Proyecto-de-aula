/**
 * Basado en el diagrama de flujo/grafo:
 *   Proceso 2. Inicio de sesión — Escenario B
 *   Fuente real: src/interface/middlewares/auth.middleware.ts — authenticate()
 *
 * Caminos cubiertos:
 *   1,2,3,F        -> sin header/"Bearer " -> 401 "Token requerido"
 *   1,2,4,5,6,7,F  -> token inválido/expirado -> 401 "Token inválido o expirado"
 *   1,2,4,5,6,8,9,F -> token válido -> req.user asignado, next()
 */
import { describe, it, expect, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import { authenticate } from '../../../src/interface/middlewares/auth.middleware'

function makeRes() {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('authenticate() — Middleware de verificación de token JWT', () => {
  it('Camino 1,2,3,F — sin header Authorization: responde 401 "Token requerido"', () => {
    const req: any = { headers: {} }
    const res = makeRes()
    const next = vi.fn()

    authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Token requerido' })
    expect(next).not.toHaveBeenCalled()
  })

  it('Camino 1,2,4,5,6,7,F — token inválido: responde 401 "Token inválido o expirado"', () => {
    const req: any = { headers: { authorization: 'Bearer token-invalido' } }
    const res = makeRes()
    const next = vi.fn()

    authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado' })
    expect(next).not.toHaveBeenCalled()
  })

  it('Camino 1,2,4,5,6,8,9,F — token válido: asigna req.user y llama next()', () => {
    const token = jwt.sign({ id: 'user-1', role: 'ADMIN' }, process.env.JWT_SECRET!)
    const req: any = { headers: { authorization: `Bearer ${token}` } }
    const res = makeRes()
    const next = vi.fn()

    authenticate(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.user).toMatchObject({ id: 'user-1', role: 'ADMIN' })
    expect(res.status).not.toHaveBeenCalled()
  })
})
