import { describe, it, expect } from 'vitest'
import { loginDto, registerDto } from '../../../src/application/dtos/auth.dto'

// Basado en: application/dtos/auth.dto.ts — la validación de email que
// comparten registerDto y loginDto.
//
// El esquema no se exporta por separado, así que se ejercita a través de los
// dos DTO que lo usan. Hoy valida únicamente el formato del correo: no hay
// lista de dominios permitidos ni normalización de mayúsculas.

const base = { name: 'Mario', password: 'password123' }

describe('validación de email (compartida entre registro y login)', () => {
  // Camino 1,2,3,4,F — email con formato inválido
  it.each([
    ['sin dominio', 'usuario@'],
    ['sin arroba', 'usuario.gmail.com'],
    ['sin nombre', '@gmail.com'],
    ['vacío', ''],
  ])('rechaza un correo %s', (_caso, email) => {
    const result = registerDto.safeParse({ ...base, email })

    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.errors.find((e) => e.path[0] === 'email')
      expect(emailError?.message).toBe('Email inválido')
    }
  })

  // Camino 1,2,3,5,6,F — email con formato válido
  it('acepta un correo con formato válido', () => {
    const result = registerDto.safeParse({ ...base, email: 'user@gmail.com' })

    expect(result.success).toBe(true)
  })

  it.each(['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'empresa.com'])(
    'acepta el dominio %s, porque el esquema no restringe dominios',
    (domain) => {
      const result = registerDto.safeParse({ ...base, email: `user@${domain}` })

      expect(result.success).toBe(true)
    },
  )

  it('aplica la misma validación en loginDto', () => {
    expect(
      loginDto.safeParse({ email: 'usuario@', password: 'password123' }).success,
    ).toBe(false)

    expect(
      loginDto.safeParse({ email: 'user@gmail.com', password: 'password123' })
        .success,
    ).toBe(true)
  })
})
