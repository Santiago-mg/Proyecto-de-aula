import { expect } from 'chai'
import { describe, it, vi } from 'vitest'
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
    // Arrange
    const req = { body: { name: 'a' } } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    // Act
    validate(schema)(req, res, next)

    // Assert
    expect(vi.mocked(res.status).mock.calls).to.deep.include([400])
    const cuerpo = vi.mocked(res.json).mock.calls[0][0]
    expect(cuerpo).to.include({ error: 'Datos inválidos' })
      .and.have.property('errors').that.is.an('array').and.is.not.empty
    expect(vi.mocked(next).mock.calls).to.be.empty
  })

  // Camino 1,2,3,6,7,F — body/query cumple el esquema Zod
  it('reemplaza req.body con los datos parseados y llama next() cuando el body es válido', () => {
    // Arrange
    const req = { body: { name: 'Mario' } } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    // Act
    validate(schema)(req, res, next)

    // Assert
    expect(req.body).to.deep.equal({ name: 'Mario' })
    expect(vi.mocked(next).mock.calls).to.have.lengthOf(1)
    expect(vi.mocked(res.status).mock.calls).to.be.empty
  })

  it('valida req.query en lugar de req.body cuando source = "query"', () => {
    // Arrange
    const req = { query: { name: 'Mario' } } as unknown as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    // Act
    validate(schema, 'query')(req, res, next)

    // Assert
    expect(req.query).to.deep.equal({ name: 'Mario' })
    expect(vi.mocked(next).mock.calls).to.have.lengthOf(1)
  })
})
