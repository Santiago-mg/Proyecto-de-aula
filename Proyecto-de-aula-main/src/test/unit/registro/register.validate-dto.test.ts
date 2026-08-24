/**
 * Basado en el diagrama de flujo/grafo:
 *   Proceso 1. Registro de usuario — Escenario B
 *   Fuente real: src/interface/middlewares/validate.middleware.ts — validate()
 *                aplicado sobre registerDto (src/application/dtos/auth.dto.ts)
 *
 * Caminos cubiertos:
 *   1,2,3,4,F -> result.success === false -> res.status(400).json({error, errors})
 *   1,2,3,5,6,F -> result.success === true -> req.body = result.data; next()
 */
import { describe, it, expect, vi } from 'vitest'
import { validate } from '../../../src/interface/middlewares/validate.middleware'
import { registerDto } from '../../../src/application/dtos/auth.dto'

function makeRes() {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('validate(registerDto) — Validación del DTO en POST /auth/register', () => {
  it('Camino 1,2,3,4,F — body con campos inválidos (password corto): responde 400', () => {
    const req: any = {
      body: {
        email: 'user@gmail.com',
        name: 'Ana',
        password: '123', // menor a 8 caracteres
      },
    }
    const res = makeRes()
    const next = vi.fn()

    validate(registerDto)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Datos inválidos' }),
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('Camino 1,2,3,5,6,F — body válido: reasigna req.body y llama a next()', () => {
    const req: any = {
      body: {
        email: 'USER@GMAIL.COM', // debe normalizarse a minúsculas
        name: 'Ana',
        password: 'password123',s
      },
    }
    const res = makeRes()
    const next = vi.fn()

    validate(registerDto)(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
    // El DTO normaliza el email (trim + toLowerCase)
    expect(req.body.email).toBe('user@gmail.com')
  })

  it('rechaza dominios de correo no permitidos (emailSchema dentro de registerDto)', () => {
    const result = registerDto.safeParse({
      email: 'user@empresa.com',
      name: 'Ana',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })
})
