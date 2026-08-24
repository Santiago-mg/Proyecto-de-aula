/**
 * Basado en el diagrama de flujo/grafo:
 *   Proceso 4. Validación de credenciales — Escenario A
 *   Fuente real: src/interface/middlewares/validate.middleware.ts — validate()
 *
 * Caminos cubiertos:
 *   1,2,3,4,5,F -> result.success === false -> res.status(400).json({error, errors})
 *   1,2,3,6,7,F -> result.success === true  -> req.body = result.data; next()
 */
import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { validate } from '../../../src/interface/middlewares/validate.middleware'

const schema = z.object({ reason: z.string().min(4, 'El motivo debe tener al menos 4 caracteres') })

function makeRes() {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('validate() — Middleware genérico de validación con Zod', () => {
  it('Camino 1,2,3,4,5,F — body no cumple el esquema: responde 400 con errores por campo', () => {
    const req: any = { body: { reason: 'no' } }
    const res = makeRes()
    const next = vi.fn()

    validate(schema)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    const payload = res.json.mock.calls[0][0]
    expect(payload.error).toBe('Datos inválidos')
    expect(payload.errors[0]).toMatchObject({ field: 'reason' })
    expect(next).not.toHaveBeenCalled()
  })

  it('Camino 1,2,3,6,7,F — body cumple el esquema: reasigna req.body y continúa', () => {
    const req: any = { body: { reason: 'Motivo válido' } }
    const res = makeRes()
    const next = vi.fn()

    validate(schema)(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.body).toEqual({ reason: 'Motivo válido' })
  })

  it('valida sobre req.query cuando source="query"', () => {
    const req: any = { query: { reason: 'ok' } }
    const res = makeRes()
    const next = vi.fn()
s
    validate(schema, 'query')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400) // 'ok' tiene solo 2 caracteres
  })
})
