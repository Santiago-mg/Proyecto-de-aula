import { describe, it, expect } from 'vitest'
import { loginDto, registerDto } from '../../../src/application/dtos/auth.dto'
import { MENSAJE_DOMINIO } from '../../../src/domain/credenciales'

// Basado en: application/dtos/auth.dto.ts — validación del correo.
//
// Registro y login comparten formato y normalización (trim + minúsculas).
// La lista de dominios permitidos solo aplica al registro: es la misma regla
// que muestra el formulario del frontend, ahora aplicada también en el
// servidor para que no se pueda saltar llamando a la API directamente.

const base = { name: 'Mario', password: 'Password123' }

function errorDeEmail(resultado: ReturnType<typeof registerDto.safeParse>) {
  return resultado.success
    ? undefined
    : resultado.error.errors.find((e) => e.path[0] === 'email')?.message
}

describe('validación de email — formato (registro y login)', () => {
  it.each([
    ['sin dominio', 'usuario@'],
    ['sin arroba', 'usuario.gmail.com'],
    ['sin nombre', '@gmail.com'],
    ['vacío', ''],
  ])('rechaza un correo %s', (_caso, email) => {
    expect(errorDeEmail(registerDto.safeParse({ ...base, email }))).toBe('Email inválido')
  })

  it('aplica el mismo formato en loginDto', () => {
    expect(loginDto.safeParse({ email: 'usuario@', password: 'x' }).success).toBe(false)
    expect(loginDto.safeParse({ email: 'user@gmail.com', password: 'x' }).success).toBe(true)
  })
})

describe('validación de email — normalización', () => {
  it('el registro guarda el correo en minúsculas y sin espacios', () => {
    const r = registerDto.safeParse({ ...base, email: '  Ana.Perez@Gmail.COM ' })
    expect(r.success && r.data.email).toBe('ana.perez@gmail.com')
  })

  it('el login normaliza igual, así que encuentra la cuenta escrita con mayúsculas', () => {
    const r = loginDto.safeParse({ email: 'ANA.PEREZ@gmail.com', password: 'x' })
    expect(r.success && r.data.email).toBe('ana.perez@gmail.com')
  })
})

describe('validación de email — dominios permitidos (solo registro)', () => {
  it.each(['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'])(
    'acepta el dominio %s',
    (dominio) => {
      expect(registerDto.safeParse({ ...base, email: `user@${dominio}` }).success).toBe(true)
    },
  )

  it.each(['empresa.com', 'gmail.co', 'mail.gmail.com'])(
    'rechaza el dominio %s con el mensaje que ve el usuario',
    (dominio) => {
      expect(errorDeEmail(registerDto.safeParse({ ...base, email: `user@${dominio}` }))).toBe(
        MENSAJE_DOMINIO,
      )
    },
  )

  it('el login no exige dominio: la cuenta admin@celularpro.co puede ingresar', () => {
    expect(
      loginDto.safeParse({ email: 'admin@celularpro.co', password: 'admin1234' }).success,
    ).toBe(true)
  })
})
