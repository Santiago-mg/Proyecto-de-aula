import { describe, it, expect } from 'vitest'
import {
  MENSAJE_DOMINIO,
  MENSAJES_PASSWORD,
  cambioPasswordSchema,
  loginSchema,
  perfilSchema,
  registroSchema,
} from '../../../src/validation/credenciales'

// Basado en: validation/credenciales.ts — esquemas que usan Login, Register
// y Profile. Son los mismos mensajes que devuelve el backend.

const registroValido = {
  name: 'Ana',
  email: 'ana@gmail.com',
  password: 'Password123',
  confirmPassword: 'Password123',
}

function mensajes(r: { success: boolean; error?: { issues: { message: string }[] } }) {
  return r.success ? [] : r.error!.issues.map((i) => i.message)
}

describe('loginSchema', () => {
  it('normaliza el correo a minúsculas y sin espacios', () => {
    const r = loginSchema.safeParse({ email: ' Ana@Gmail.COM ', password: 'x' })
    expect(r.success && r.data.email).toBe('ana@gmail.com')
  })

  it('no exige dominio permitido (el admin usa @celularpro.co)', () => {
    expect(loginSchema.safeParse({ email: 'admin@celularpro.co', password: 'x' }).success).toBe(true)
  })
})

describe('registroSchema', () => {
  it('acepta un registro válido', () => {
    expect(registroSchema.safeParse(registroValido).success).toBe(true)
  })

  it('rechaza un dominio no permitido', () => {
    expect(mensajes(registroSchema.safeParse({ ...registroValido, email: 'a@empresa.com' }))).toContain(
      MENSAJE_DOMINIO,
    )
  })

  it.each([
    ['sin mayúscula', 'password123', MENSAJES_PASSWORD.mayuscula],
    ['sin minúscula', 'PASSWORD123', MENSAJES_PASSWORD.minuscula],
    ['sin número', 'PasswordSegura', MENSAJES_PASSWORD.numero],
    ['corta', 'Pass1', MENSAJES_PASSWORD.corta],
  ])('rechaza una contraseña %s', (_caso, password, mensaje) => {
    const r = registroSchema.safeParse({ ...registroValido, password, confirmPassword: password })
    expect(mensajes(r)).toContain(mensaje)
  })

  it('exige que la confirmación coincida', () => {
    const r = registroSchema.safeParse({ ...registroValido, confirmPassword: 'Otra12345' })
    expect(mensajes(r)).toEqual(['Las contraseñas no coinciden'])
  })
})

describe('perfilSchema y cambioPasswordSchema', () => {
  it('recorta el nombre y exige al menos 2 caracteres', () => {
    expect(perfilSchema.safeParse({ name: '  A ' }).success).toBe(false)
    const r = perfilSchema.safeParse({ name: '  Ana  ' })
    expect(r.success && r.data.name).toBe('Ana')
  })

  it('no permite repetir la contraseña actual', () => {
    const r = cambioPasswordSchema.safeParse({
      currentPassword: 'Actual123',
      newPassword: 'Actual123',
      confirmPassword: 'Actual123',
    })
    expect(mensajes(r)).toContain('La nueva contraseña debe ser distinta de la actual')
  })

  it('acepta un cambio válido', () => {
    expect(
      cambioPasswordSchema.safeParse({
        currentPassword: 'Actual123',
        newPassword: 'Nueva1234',
        confirmPassword: 'Nueva1234',
      }).success,
    ).toBe(true)
  })
})
