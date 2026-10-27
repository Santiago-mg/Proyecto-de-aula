import { describe, it } from 'vitest'
import { expect } from 'chai'
import {
  DOMINIOS_PERMITIDOS,
  MENSAJES_PASSWORD,
  dominioPermitido,
  loginSchema,
  normalizarEmail,
  registroSchema,
} from '../../src/validation/credenciales'
import type { StockAlert } from '../../src/types/admin'

/**
 * Aserciones fluidas con Chai sobre la validación de credenciales, el
 * registro, el inicio de sesión y la forma de las alertas de stock que
 * consume el panel de administración.
 */

describe('Validación de credenciales — fluido', () => {
  it('los dominios permitidos son los mismos cinco del backend', () => {
    expect([...DOMINIOS_PERMITIDOS], 'dominios permitidos')
      .to.have.lengthOf(5)
      .and.to.have.members(['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'])
  })

  it('normaliza y valida el dominio sin importar mayúsculas', () => {
    expect(normalizarEmail('  ANA@Gmail.com '), 'correo normalizado').to.equal('ana@gmail.com')
    expect(dominioPermitido('ana@EMPRESA.com'), 'dominio no permitido').to.be.false
  })
})

describe('Registro e inicio de sesión — fluido', () => {
  it('el registro entrega los datos limpios', () => {
    const r = registroSchema.safeParse({
      name: '  Ana ',
      email: ' Ana@Gmail.com ',
      password: 'Password123',
      confirmPassword: 'Password123',
    })

    expect(r.success, 'registro válido').to.be.true
    if (r.success) {
      expect(r.data, 'datos del registro').to.include({ name: 'Ana', email: 'ana@gmail.com' })
    }
  })

  it('una contraseña débil acumula los mensajes de cada regla', () => {
    const r = registroSchema.safeParse({
      name: 'Ana',
      email: 'ana@gmail.com',
      password: 'abc',
      confirmPassword: 'abc',
    })

    expect(r.success, 'registro con contraseña débil').to.be.false
    if (!r.success) {
      expect(r.error.issues.map((i) => i.message), 'mensajes')
        .to.include.members([MENSAJES_PASSWORD.corta, MENSAJES_PASSWORD.mayuscula, MENSAJES_PASSWORD.numero])
        .and.not.include(MENSAJES_PASSWORD.minuscula)
    }
  })

  it('el login acepta correos fuera de la lista (cuentas existentes)', () => {
    expect(loginSchema.safeParse({ email: 'admin@celularpro.co', password: 'x' }).success, 'login admin')
      .to.be.true
  })
})

describe('Alertas de stock bajo — contrato con la API (fluido)', () => {
  const alerta: StockAlert = {
    id: 'a1',
    phoneId: 'p1',
    type: 'LOW_STOCK',
    message: '"iPhone 13" tiene 2 unidades, en o por debajo del mínimo de 5.',
    isResolved: false,
    createdAt: '2026-10-01T00:00:00.000Z',
    phone: { id: 'p1', name: 'iPhone 13', slug: 'iphone-13', stock: 2, minStock: 5, heroImage: null },
  }

  it('una alerta abierta trae el celular con stock y mínimo', () => {
    expect(alerta, 'alerta').to.include({ type: 'LOW_STOCK', isResolved: false })
    expect(alerta.phone, 'celular de la alerta')
      .to.have.property('stock')
      .that.is.at.most(alerta.phone.minStock)
  })
})
