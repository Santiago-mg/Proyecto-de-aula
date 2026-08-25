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
    if (!result.success) {
      const error = result.error.errors.find((e) => e.path[0] === 'password')
      expect(error?.message).toBe('La contraseña debe tener al menos 8 caracteres')
    }
  })

  it('rechaza un body sin el campo name', () => {
    const result = registerDto.safeParse({
      email: 'user@gmail.com',
      password: 'password123',
    })

    expect(result.success).toBe(false)
  })

  it('rechaza un name de una sola letra', () => {
    const result = registerDto.safeParse({
      email: 'user@gmail.com',
      name: 'M',
      password: 'password123',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const error = result.error.errors.find((e) => e.path[0] === 'name')
      expect(error?.message).toBe('El nombre debe tener al menos 2 caracteres')
    }
  })

  it('acumula todos los errores del body, no solo el primero', () => {
    const result = registerDto.safeParse({ email: 'no-es-correo', name: 'M', password: '1' })

    expect(result.success).toBe(false)
    if (!result.success) {
      const campos = result.error.errors.map((e) => e.path[0])
      expect(campos).toEqual(expect.arrayContaining(['email', 'name', 'password']))
    }
  })

  // Camino 1,2,3,5,6,F — body cumple registerDto
  it('acepta un body válido y retorna los datos parseados', () => {
    const body = {
      email: 'user@gmail.com',
      name: 'Mario',
      password: 'password123',
    }

    const result = registerDto.safeParse(body)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(body)
    }
  })

  it('descarta los campos que no están en el esquema', () => {
    const result = registerDto.safeParse({
      email: 'user@gmail.com',
      name: 'Mario',
      password: 'password123',
      role: 'ADMIN',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      // Un cliente no puede darse el rol de administrador por el body.
      expect(result.data).not.toHaveProperty('role')
    }
  })
})
