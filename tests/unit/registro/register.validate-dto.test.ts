import { expect } from 'chai'
import { describe, it } from 'vitest'
import { registerDto } from '../../../src/application/dtos/auth.dto'

// Basado en: interface/middlewares/validate.middleware.ts + auth.dto.ts (registerDto)

describe('registerDto (validación del body en POST /auth/register)', () => {
  // Camino 1,2,3,4,F — body con campos faltantes o inválidos
  it('rechaza un body con password demasiado corto', () => {
    // Act
    const result = registerDto.safeParse({
      email: 'user@gmail.com',
      name: 'Mario',
      password: '123',
    })

    // Assert
    expect(result.success).to.be.false
    if (!result.success) {
      const error = result.error.errors.find((e) => e.path[0] === 'password')
      expect(error?.message).to.equal('La contraseña debe tener al menos 8 caracteres')
    }
  })

  it('rechaza un body sin el campo name', () => {
    // Act
    const result = registerDto.safeParse({
      email: 'user@gmail.com',
      password: 'Password123',
    })

    // Assert
    expect(result.success).to.be.false
  })

  it('rechaza un name de una sola letra', () => {
    // Act
    const result = registerDto.safeParse({
      email: 'user@gmail.com',
      name: 'M',
      password: 'Password123',
    })

    // Assert
    expect(result.success).to.be.false
    if (!result.success) {
      const error = result.error.errors.find((e) => e.path[0] === 'name')
      expect(error?.message).to.equal('El nombre debe tener al menos 2 caracteres')
    }
  })

  it('acumula todos los errores del body, no solo el primero', () => {
    // Act
    const result = registerDto.safeParse({ email: 'no-es-correo', name: 'M', password: '1' })

    // Assert
    expect(result.success).to.be.false
    if (!result.success) {
      const campos = result.error.errors.map((e) => e.path[0])
      expect(campos).to.include.members(['email', 'name', 'password'])
    }
  })

  // Camino 1,2,3,5,6,F — body cumple registerDto
  it('acepta un body válido y retorna los datos parseados', () => {
    // Arrange
    const body = {
      email: 'user@gmail.com',
      name: 'Mario',
      password: 'Password123',
    }

    // Act
    const result = registerDto.safeParse(body)

    // Assert
    expect(result.success).to.be.true
    if (result.success) {
      expect(result.data).to.deep.equal(body)
    }
  })

  it('descarta los campos que no están en el esquema', () => {
    // Act
    const result = registerDto.safeParse({
      email: 'user@gmail.com',
      name: 'Mario',
      password: 'Password123',
      role: 'ADMIN',
    })

    // Assert
    expect(result.success).to.be.true
    if (result.success) {
      // Un cliente no puede darse el rol de administrador por el body.
      expect(result.data).to.not.have.property('role')
    }
  })
})
