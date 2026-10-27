import { describe, it, expect } from 'vitest'
import { registerDto, changePasswordDto } from '../../../src/application/dtos/auth.dto'
import {
  MENSAJES_PASSWORD,
  PASSWORD_MAX,
  PASSWORD_MIN,
  passwordSegura,
  problemasDePassword,
} from '../../../src/domain/credenciales'

// Basado en: domain/credenciales.ts (regla pura) + auth.dto.ts (passwordSchema)
//
// La misma política se aplica al registrar una cuenta y al cambiar la
// contraseña desde el perfil.

describe('política de contraseñas — regla de dominio', () => {
  it('acepta una contraseña con minúscula, mayúscula y número de 8 caracteres', () => {
    expect(problemasDePassword('Clave123')).toEqual([])
    expect(passwordSegura('Clave123')).toBe(true)
  })

  it.each([
    ['corta', 'Clave12', MENSAJES_PASSWORD.corta],
    ['sin minúscula', 'CLAVE1234', MENSAJES_PASSWORD.minuscula],
    ['sin mayúscula', 'clave1234', MENSAJES_PASSWORD.mayuscula],
    ['sin número', 'ClaveSegura', MENSAJES_PASSWORD.numero],
  ])('rechaza una contraseña %s', (_caso, password, mensaje) => {
    expect(problemasDePassword(password)).toEqual([mensaje])
  })

  it('acumula todos los problemas en un orden fijo', () => {
    expect(problemasDePassword('abc')).toEqual([
      MENSAJES_PASSWORD.corta,
      MENSAJES_PASSWORD.mayuscula,
      MENSAJES_PASSWORD.numero,
    ])
  })

  // Valores límite de la longitud
  it.each([
    [PASSWORD_MIN - 1, false],
    [PASSWORD_MIN, true],
    [PASSWORD_MAX, true],
    [PASSWORD_MAX + 1, false],
  ])('con %i caracteres la contraseña es válida: %s', (longitud, esperado) => {
    const password = 'Aa1' + 'x'.repeat(longitud - 3)
    expect(password).toHaveLength(longitud)
    expect(passwordSegura(password)).toBe(esperado)
  })
})

describe('política de contraseñas — DTO de registro', () => {
  const base = { email: 'ana@gmail.com', name: 'Ana' }

  it('devuelve el mensaje de la regla incumplida en el campo password', () => {
    const r = registerDto.safeParse({ ...base, password: 'password123' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.errors.map((e) => [e.path[0], e.message])).toEqual([
        ['password', MENSAJES_PASSWORD.mayuscula],
      ])
    }
  })

  it('acepta una contraseña que cumple todas las reglas', () => {
    expect(registerDto.safeParse({ ...base, password: 'Password123' }).success).toBe(true)
  })
})

describe('política de contraseñas — DTO de cambio de contraseña', () => {
  it('aplica la misma política a la contraseña nueva', () => {
    const r = changePasswordDto.safeParse({ currentPassword: 'Actual123', newPassword: 'corta' })
    expect(r.success).toBe(false)
  })

  it('no permite repetir la contraseña actual', () => {
    const r = changePasswordDto.safeParse({ currentPassword: 'Actual123', newPassword: 'Actual123' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.errors[0]).toMatchObject({
        path: ['newPassword'],
        message: 'La nueva contraseña debe ser distinta de la actual',
      })
    }
  })

  it('exige la contraseña actual', () => {
    const r = changePasswordDto.safeParse({ currentPassword: '', newPassword: 'Nueva1234' })
    expect(r.success).toBe(false)
  })
})
