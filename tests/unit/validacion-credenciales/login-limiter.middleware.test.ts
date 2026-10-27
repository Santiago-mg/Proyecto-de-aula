import { describe, expect, it, vi, afterEach } from 'vitest'
import { EventEmitter } from 'node:events'
import type { NextFunction, Request, Response } from 'express'
import { limitarIntentosLogin } from '../../../src/interface/middlewares/login-limiter.middleware'

// Basado en: login-limiter.middleware.ts — ramas que no se alcanzan por HTTP
// (validate() rechaza antes un body sin email; Express siempre define req.ip).

function respuesta(status = 401) {
  const res = new EventEmitter() as unknown as Response & EventEmitter
  res.statusCode = status
  res.setHeader = vi.fn() as never
  res.status = vi.fn().mockReturnValue(res) as never
  res.json = vi.fn().mockReturnValue(res) as never
  return res
}

function intentar(req: Partial<Request>, status = 401) {
  const res = respuesta(status)
  const next = vi.fn() as NextFunction
  limitarIntentosLogin(req as Request, res, next)
  if ((next as ReturnType<typeof vi.fn>).mock.calls.length) res.emit('finish')
  return { res, next }
}

afterEach(() => vi.useRealTimers())

describe('limitarIntentosLogin — ramas defensivas', () => {
  it('sin req.ip ni email en el body agrupa los intentos bajo una clave común', () => {
    for (let i = 0; i < 5; i++) intentar({ body: {} })

    const { res, next } = intentar({ body: {} })

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(429)
  })

  it('cuando falta menos de un minuto usa el singular "minuto"', () => {
    const inicio = Date.now()
    for (let i = 0; i < 5; i++) intentar({ ip: '10.0.0.9', body: { email: 'x@gmail.com' } })

    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(inicio + 15 * 60 * 1000 - 30_000)
    const { res } = intentar({ ip: '10.0.0.9', body: { email: 'x@gmail.com' } })

    expect(res.json).toHaveBeenCalledWith({
      error: 'Demasiados intentos fallidos. Intenta de nuevo en 1 minuto.',
    })
  })

  it('una respuesta que no es 401 ni 200 (p. ej. 403) no suma ni borra fallos', () => {
    for (let i = 0; i < 4; i++) intentar({ ip: '10.0.0.7', body: { email: 'y@gmail.com' } })
    intentar({ ip: '10.0.0.7', body: { email: 'y@gmail.com' } }, 403)

    const { next } = intentar({ ip: '10.0.0.7', body: { email: 'y@gmail.com' } })

    expect(next).toHaveBeenCalled()
  })
})
