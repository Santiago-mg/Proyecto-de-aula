import { expect } from 'chai'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { AppError } from '../../../src/domain/AppError'
import { errorHandler } from '../../../src/interface/middlewares/error.middleware'

/**
 * errorHandler aislado de Express.
 *
 * El resto de la suite lo ejercita de rebote, a través de peticiones HTTP.
 * Aquí se le pasan errores a mano para fijar las tres respuestas que tiene
 * que dar —AppError, ZodError y cualquier otra cosa— y, sobre todo, para
 * dejar cubierto que en producción no se filtra el detalle interno.
 */

let req: Request
let res: Response
let next: NextFunction
let json: ReturnType<typeof vi.fn>
let status: ReturnType<typeof vi.fn>

const entornoOriginal = process.env.NODE_ENV

/** Produce un ZodError de verdad, en vez de inventar uno a mano. */
function errorDeZod(esquema: z.ZodTypeAny, valor: unknown): z.ZodError {
  const resultado = esquema.safeParse(valor)
  if (resultado.success) {
    throw new Error('El esquema de prueba debía fallar y no falló')
  }
  return resultado.error
}

beforeEach(() => {
  json = vi.fn()
  status = vi.fn().mockReturnValue({ json })
  req = {} as Request
  res = { status } as unknown as Response
  next = vi.fn() as NextFunction
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  process.env.NODE_ENV = entornoOriginal
})

describe('AppError — errores esperados del negocio', () => {
  it('responde con el código y el mensaje que trae el error', () => {
    // Act
    errorHandler(new AppError('Credenciales inválidas', 401), req, res, next)

    // Assert
    expect(status.mock.calls).to.deep.include([401])
    expect(json.mock.calls).to.deep.include([{ error: 'Credenciales inválidas' }])
  })

  it('no ensucia la consola: un 403 no es una falla del servidor', () => {
    // Act
    errorHandler(new AppError('Acceso restringido', 403), req, res, next)

    // Assert
    expect(vi.mocked(console.error).mock.calls).to.be.empty
  })

  it('respeta el código de cada caso', () => {
    // Arrange
    const casos: [string, number][] = [
      ['Token requerido', 401],
      ['Acceso restringido', 403],
      ['Orden no encontrada', 404],
      ['El email ya está registrado', 409],
    ]

    // Act & Assert
    for (const [mensaje, codigo] of casos) {
      errorHandler(new AppError(mensaje, codigo), req, res, next)
      expect(status.mock.calls).to.deep.include([codigo])
    }
  })
})

describe('ZodError — red de seguridad de validación', () => {
  const esquema = z.object({ status: z.enum(['PENDING', 'CANCELLED']) })

  it('un dato de entrada malo es 400, no 500', () => {
    // Act
    errorHandler(errorDeZod(esquema, { status: 'INVENTADO' }), req, res, next)

    // Assert
    expect(status.mock.calls).to.deep.include([400])
    expect(json.mock.calls[0][0]).to.include({ error: 'Datos inválidos' })
  })

  it('cada problema de Zod sale como { field, message }', () => {
    // Act
    errorHandler(errorDeZod(esquema, { status: 'INVENTADO' }), req, res, next)

    // Assert
    const cuerpo = json.mock.calls[0][0]
    expect(cuerpo).to.have.all.keys('error', 'errors')
    expect(cuerpo.error).to.equal('Datos inválidos')
    expect(cuerpo.errors).to.have.lengthOf(1)
    expect(cuerpo.errors[0]).to.have.all.keys('field', 'message').and.include({ field: 'status' })
    expect(cuerpo.errors[0].message).to.be.a('string').and.not.be.empty
  })

  it('con varios campos malos, sale uno por campo', () => {
    // Arrange
    const varios = z.object({
      email: z.string().email(),
      qty: z.number().positive(),
    })

    // Act
    errorHandler(
      errorDeZod(varios, { email: 'no-es-email', qty: -1 }),
      req,
      res,
      next,
    )

    // Assert
    const cuerpo = json.mock.calls[0][0]
    const campos = cuerpo.errors.map((e: { field: string }) => e.field)
    expect(cuerpo.error).to.equal('Datos inválidos')
    expect(campos).to.include.members(['email', 'qty'])
  })

  it('tampoco se loggea: la culpa es del cliente, no del servidor', () => {
    // Act
    errorHandler(errorDeZod(esquema, { status: 'INVENTADO' }), req, res, next)

    // Assert
    expect(vi.mocked(console.error).mock.calls).to.be.empty
  })
})

describe('Cualquier otro error — 500', () => {
  it('el cliente recibe un mensaje genérico', () => {
    // Arrange
    process.env.NODE_ENV = 'development'

    // Act
    errorHandler(new Error('Connection timeout'), req, res, next)

    // Assert
    expect(status.mock.calls).to.deep.include([500])
    expect(json.mock.calls[0][0]).to.include({ error: 'Error interno del servidor' })
  })

  it('fuera de producción sí viaja el detalle, para diagnosticar', () => {
    // Arrange
    process.env.NODE_ENV = 'development'

    // Act
    errorHandler(new Error('Connection timeout'), req, res, next)

    // Assert
    expect(json.mock.calls).to.deep.include([{
      error: 'Error interno del servidor',
      detail: 'Connection timeout',
    }])
  })

  it('en producción no se filtra nada del error interno', () => {
    // Arrange
    process.env.NODE_ENV = 'production'
    // Un mensaje de driver puede arrastrar host, tabla y hasta credenciales.
    const err = new Error('timeout host=db.internal user=admin')

    // Act
    errorHandler(err, req, res, next)

    // Assert
    expect(json.mock.calls).to.deep.include([{ error: 'Error interno del servidor' }])
    expect(json.mock.calls[0][0]).to.not.have.property('detail')
  })

  it('el log del servidor conserva mensaje y traza, aunque el cliente no los vea', () => {
    // Arrange
    process.env.NODE_ENV = 'production'
    const err = new Error('Something broke')
    err.stack = 'Error: Something broke\n    at algo (archivo.ts:10:5)'

    // Act
    errorHandler(err, req, res, next)

    // Assert
    expect(vi.mocked(console.error).mock.calls).to.deep.include(['[ERROR 500]', 'Something broke'])
    expect(vi.mocked(console.error).mock.calls).to.deep.include([err.stack])
  })
})

describe('En todos los casos', () => {
  it('nunca delega con next(): el manejador es el último de la cadena', () => {
    // Arrange
    errorHandler(new AppError('X', 400), req, res, next)
    errorHandler(errorDeZod(z.object({ x: z.string() }), { x: 123 }), req, res, next)

    // Act
    errorHandler(new Error('Y'), req, res, next)

    // Assert
    expect(vi.mocked(next).mock.calls).to.be.empty
  })
})
