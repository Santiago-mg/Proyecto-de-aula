import { describe, it, expect } from 'vitest'
import { registerDto } from '../../../src/application/dtos/auth.dto'

// Basado en: interface/middlewares/validate.middleware.ts + auth.dto.ts (registerDto)

describe('registerDto (validación del body en POST /auth/register)', () => {
  // Camino 1,2,3,4,F — body con campos faltantes o inválidos
  it('rechaza un body con password demasiado corto', () => {
    const result = registerDto.safeParse({
      email: 'user@gmail.com',
      name: 'Mario',
      password: '123',
    })

    expect(result.success).toBe(false)
  })

  it('rechaza un body sin el campo name', () => {
    const result = registerDto.safeParse({
      email: 'user@gmail.com',
      password: 'password123',
    })

    expect(result.success).toBe(false)
  })

  // Camino 1,2,3,5,6,F — body cumple registerDto
  it('acepta un body válido y retorna los datos parseados', () => {
    const result = registerDto.safeParse({
      email: 'USER@Gmail.com',
      name: '  Mario  ',
      password: 'password123',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      // email se normaliza a minúsculas y sin espacios (trim + toLowerCase)
      expect(result.data.email).toBe('user@gmail.com')
      expect(result.data.name).toBe('Mario')
    }
  })
})
