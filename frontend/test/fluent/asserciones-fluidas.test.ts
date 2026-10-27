import { describe, it } from 'vitest'
import { expect } from 'chai'
import { calcularTotales, UMBRAL_ENVIO_GRATIS, COSTO_ENVIO } from '../../src/utils/pricing'
import { checkoutSchema } from '../../src/pages/Checkout'

/**
 * Aserciones fluidas (estilo fluent-assertions-multilanguage, módulo JS con
 * Chai) sobre la lógica pura del frontend: el resumen de precios que se
 * muestra antes de pagar (func. 22 — crear orden) y el schema de
 * validación del formulario de checkout.
 *
 * Igual que en el backend, `expect(valor, 'mensaje')` documenta qué se
 * está comprobando sin depender del nombre del `it`.
 */

describe('calcularTotales — aserciones fluidas', () => {
  it('expone subtotal, envío y total como un objeto fluido', () => {
    // Arrange
    const items = [
      { price: 100_000, qty: 2 },
      { price: 50_000, qty: 1 },
    ]

    // Act
    const totales = calcularTotales(items)

    // Assert: objeto fluido — las tres cifras en una sola expresión.
    expect(totales, 'totales de un carrito de 250.000').to.deep.equal({
      subtotal: 250_000,
      shipping: COSTO_ENVIO,
      total: 270_000,
    })
  })

  it('el carrito vacío no cobra envío ni tiene total negativo', () => {
    // Act
    const totales = calcularTotales([])

    // Assert
    expect(totales.subtotal, 'subtotal de un carrito vacío').to.equal(0)
    expect(totales.total, 'total de un carrito vacío').to.be.at.least(0)
  })

  it('el envío es gratis por encima del umbral configurado', () => {
    // Arrange
    const items = [{ price: UMBRAL_ENVIO_GRATIS + 1, qty: 1 }]

    // Act & Assert
    expect(calcularTotales(items).shipping, 'envío justo sobre el umbral').to.equal(0)
  })
})

describe('checkoutSchema — aserciones fluidas sobre excepciones', () => {
  const datosValidos = {
    email: 'ana@test.com',
    name: 'Ana Garcia',
    phone: '3001234567',
    address: 'Calle 123 #45-67',
    city: 'Bogota',
    dept: 'Cundinamarca',
  }

  it('acepta datos completos y válidos', () => {
    const resultado = checkoutSchema.safeParse(datosValidos)
    expect(resultado.success, 'checkout con todos los campos válidos').to.be.true
  })

  it('rechaza un email mal formado con el mensaje exacto que ve el usuario', () => {
    // Act
    const resultado = checkoutSchema.safeParse({ ...datosValidos, email: 'no-es-un-email' })

    // Assert: fluido sobre el resultado del parseo, sin lanzar excepción.
    expect(resultado.success, 'checkout con email inválido').to.be.false
    if (!resultado.success) {
      expect(resultado.error.issues.map((i) => i.message), 'mensajes de error del schema')
        .to.include('Email inválido')
    }
  })

  it('exige una dirección de al menos 5 caracteres', () => {
    const resultado = checkoutSchema.safeParse({ ...datosValidos, address: 'Ca1' })
    expect(resultado.success, 'dirección demasiado corta').to.be.false
  })
})
