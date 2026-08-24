import { describe, it, expect } from 'vitest'
import { registerDto } from '../../../src/application/dtos/auth.dto'

// Basado en: application/dtos/auth.dto.ts — emailSchema (compartido por registerDto y loginDto)
// emailSchema no se exporta directamente, así que se ejercita a través de registerDto.

const base = { name: 'Mario', password: 'password123' }

describe('emailSchema (compartido entre registro y login)', () => {
  // Camino 1,2,3,4,F — email con formato inválido
  it('rechaza un correo con formato inválido', () => {
    const result = registerDto.safeParse({ ...base, email: 'usuario@' })

    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.errors.find((e) => e.path[0] === 'email')
      expect(emailError?.message).toBe('Correo electrónico inválido')
    }
  })

  // Camino 1,2,3,5,6,7,F — email válido pero dominio no permitido
  it('rechaza un correo válido con dominio no permitido', () => {
    const result = registerDto.safeParse({ ...base, email: 'user@empresa.com' })

    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.errors.find((e) => e.path[0] === 'email')
      expect(emailError?.message).toContain('Gmail')
    }
  })

  // Camino 1,2,3,5,6,8,F — email válido con dominio permitido
  it('acepta un correo válido con dominio permitido', () => {
    const result = registerDto.safeParse({ ...base, email: 'user@gmail.com' })

    expect(result.success).toBe(true)
  })

  it.each(['outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'])(
    'acepta el dominio permitido %s',
    (domain) => {
      const result = registerDto.safeParse({ ...base, email: `user@${domain}` })
      expect(result.success).toBe(true)
    },
  )
})
