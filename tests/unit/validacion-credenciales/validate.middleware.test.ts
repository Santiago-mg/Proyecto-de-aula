import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { validate } from '../../../src/interface/middlewares/validate.middleware'

// Basado en: interface/middlewares/validate.middleware.ts — validate()

const schema = z.object({
  name: z.string().min(2),
})

function makeRes() {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res as Response
}

describe('validate middleware', () => {
  // Camino 1,2,3,4,5,F — body/query no cumple el esquema Zod
  it('responde 400 con un arreglo de errores por campo cuando el body es inválido', () => {
    const req = { body: { name: 'a' } } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    validate(schema)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Datos inválidos',
        errors: expect.any(Array),
      }),
    )
    expect(next).not.toHaveBeenCalled()
  })

  // Camino 1,2,3,6,7,F — body/query cumple el esquema Zod
  it('reemplaza req.body con los datos parseados y llama next() cuando el body es válido', () => {
    const req = { body: { name: 'Mario' } } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    validate(schema)(req, res, next)

    expect(req.body).toEqual({ name: 'Mario' })
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('valida req.query en lugar de req.body cuando source = "query"', () => {
    const req = { query: { name: 'Mario' } } as unknown as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    validate(schema, 'query')(req, res, next)

    expect(req.query).toEqual({ name: 'Mario' })
    expect(next).toHaveBeenCalledTimes(1)
  })
})
