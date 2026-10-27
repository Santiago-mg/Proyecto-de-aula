import { expect } from 'chai'
import { describe, it } from 'vitest'
import { loginDto, registerDto } from '../../../src/application/dtos/auth.dto'
import { MENSAJE_DOMINIO } from '../../../src/domain/credenciales'

// Basado en: application/dtos/auth.dto.ts — validación del correo.
//
// Registro y login comparten formato y normalización (trim + minúsculas).
// La lista de dominios permitidos solo aplica al registro: es la misma regla
// que muestra el formulario del frontend, aplicada también en el servidor
// para que no se pueda saltar llamando a la API directamente.

const base = { name: 'Mario', password: 'Password123' }

function errorDeEmail(resultado: ReturnType<typeof registerDto.safeParse>) {
  return resultado.success
    ? undefined
    : resultado.error.errors.find((e) => e.path[0] === 'email')?.message
}

describe('validación de email — formato (registro y login)', () => {
  // Camino 1,2,3,4,F — email con formato inválido
  it.each([
    ['sin dominio', 'usuario@'],
    ['sin arroba', 'usuario.gmail.com'],
    ['sin nombre', '@gmail.com'],
    ['vacío', ''],
  ])('rechaza un correo %s', (_caso, email) => {
    // Act
    const result = registerDto.safeParse({ ...base, email })

    // Assert
    expect(result.success).to.be.false
    expect(errorDeEmail(result)).to.equal('Email inválido')
  })

  it('aplica el mismo formato en loginDto', () => {
    // Act & Assert
    expect(loginDto.safeParse({ email: 'usuario@', password: 'x' }).success).to.be.false
    expect(loginDto.safeParse({ email: 'user@gmail.com', password: 'x' }).success).to.be.true
  })
})

describe('validación de email — normalización', () => {
  it('el registro guarda el correo en minúsculas y sin espacios', () => {
    // Act
    const result = registerDto.safeParse({ ...base, email: '  Ana.Perez@Gmail.COM ' })

    // Assert
    expect(result.success).to.be.true
    if (result.success) expect(result.data.email).to.equal('ana.perez@gmail.com')
  })

  it('el login normaliza igual, así que encuentra la cuenta escrita con mayúsculas', () => {
    // Act
    const result = loginDto.safeParse({ email: 'ANA.PEREZ@gmail.com', password: 'x' })

    // Assert
    expect(result.success).to.be.true
    if (result.success) expect(result.data.email).to.equal('ana.perez@gmail.com')
  })
})

describe('validación de email — dominios permitidos (solo registro)', () => {
  // Camino 1,2,3,5,6,F — email con formato y dominio válidos
  it.each(['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'])(
    'acepta el dominio %s',
    (dominio) => {
      // Act
      const result = registerDto.safeParse({ ...base, email: `user@${dominio}` })

      // Assert
      expect(result.success).to.be.true
    },
  )

  it.each(['empresa.com', 'gmail.co', 'mail.gmail.com'])(
    'rechaza el dominio %s con el mensaje que ve el usuario',
    (dominio) => {
      // Act
      const result = registerDto.safeParse({ ...base, email: `user@${dominio}` })

      // Assert
      expect(errorDeEmail(result)).to.equal(MENSAJE_DOMINIO)
    },
  )

  it('el login no exige dominio: la cuenta admin@celularpro.co puede ingresar', () => {
    // Act
    const result = loginDto.safeParse({ email: 'admin@celularpro.co', password: 'admin1234' })

    // Assert
    expect(result.success).to.be.true
  })
})
