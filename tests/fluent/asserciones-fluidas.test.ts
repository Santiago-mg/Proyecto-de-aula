import { describe, it } from 'vitest'
import { expect } from 'chai'
import {
  PESO_MARCA,
  PESO_CATEGORIA,
  PESO_PRECIO,
  afinidad,
  ordenarPorAfinidad,
  rangoDePrecio,
} from '../../src/domain/recomendaciones'
import { evaluarAlerta, mensajeAlerta } from '../../src/domain/stock-alerts'
import { AppError } from '../../src/domain/AppError'

/**
 * Aserciones fluidas (estilo fluent-assertions-multilanguage, módulo JS con
 * Chai) aplicadas al dominio de CelularPro.
 *
 * `expect(valor, 'mensaje')` — igual que en el ejemplo de referencia — da
 * contexto legible cuando una prueba falla, sin depender de leer el nombre
 * del `it` para saber qué se estaba comparando. Cubre las funciones puras
 * detrás de las funcionalidades 13 (recomendación de productos) y 14
 * (alertas de stock bajo): no tocan Prisma, así que no hace falta ningún
 * doble de prueba para ejercitarlas.
 */

describe('Recomendación de productos — aserciones fluidas (func. 13)', () => {
  const iphone15 = { id: 'p1', brand: 'Apple', categoryId: 'apple', price: 1_000_000 }

  it('puntúa 6 cuando coinciden marca, categoría y precio', () => {
    // Arrange
    const gemelo = { id: 'p2', brand: 'apple', categoryId: 'apple', price: 1_100_000 }

    // Act
    const puntaje = afinidad(iphone15, gemelo)

    // Assert: numérico simple, con el porqué en el mensaje.
    expect(puntaje, 'afinidad cuando coinciden marca+categoría+precio').to.equal(
      PESO_MARCA + PESO_CATEGORIA + PESO_PRECIO,
    )
  })

  it('no otorga puntos por marca cuando difiere, aunque cambien las mayúsculas del resto', () => {
    // Arrange
    const otraMarca = { id: 'p3', brand: 'Samsung', categoryId: 'apple', price: 1_000_000 }

    // Act
    const puntaje = afinidad(iphone15, otraMarca)

    // Assert
    expect(puntaje, 'afinidad sin coincidencia de marca').to.equal(
      PESO_CATEGORIA + PESO_PRECIO,
    )
  })

  it('devuelve 0 cuando no comparte ningún criterio', () => {
    // Arrange
    const sinNada = { id: 'p4', brand: 'Xiaomi', categoryId: 'gama-media', price: 5_000_000 }

    // Act & Assert
    expect(afinidad(iphone15, sinNada), 'afinidad sin nada en común').to.equal(0)
  })

  it('calcula el rango de precio equivalente con el margen configurado', () => {
    // Act
    const rango = rangoDePrecio(1_000_000)

    // Assert: objeto fluido, ambos límites en una sola expresión.
    expect(rango, 'rango de precio al 25% sobre 1.000.000')
      .to.include({ min: 750_000, max: 1_250_000 })
  })

  it('ordena por afinidad y desempata por cercanía de precio', () => {
    // Arrange: dos candidatos empatados en puntaje (misma marca, sin
    // categoría ni precio equivalentes), uno más cerca en precio que el otro.
    const candidatos = [
      { id: 'lejano', brand: 'Apple', categoryId: 'otra', price: 3_000_000 },
      { id: 'cercano', brand: 'Apple', categoryId: 'otra', price: 1_050_000 },
    ]

    // Act
    const orden = ordenarPorAfinidad(iphone15, candidatos, 2)

    // Assert: colección fluida — orden exacto, no solo membresía.
    expect(orden.map((c) => c.id), 'orden por afinidad con desempate por precio')
      .to.deep.equal(['cercano', 'lejano'])
  })

  it('recorta al límite pedido aunque haya más candidatos', () => {
    // Arrange
    const candidatos = Array.from({ length: 5 }, (_, i) => ({
      id: `c${i}`,
      brand: 'Apple',
      categoryId: 'apple',
      price: 1_000_000,
    }))

    // Act
    const orden = ordenarPorAfinidad(iphone15, candidatos, 2)

    // Assert
    expect(orden, 'recomendaciones recortadas al límite').to.have.lengthOf(2)
  })
})

describe('Alertas de stock bajo — aserciones fluidas (func. 14)', () => {
  it('el umbral es inclusivo: stock igual al mínimo ya dispara LOW_STOCK', () => {
    expect(evaluarAlerta(5, 5), 'stock == minStock').to.equal('LOW_STOCK')
  })

  it('no hay alerta con stock por encima del mínimo', () => {
    expect(evaluarAlerta(6, 5), 'stock > minStock').to.be.null
  })

  it('OUT_OF_STOCK tiene prioridad sobre LOW_STOCK cuando el stock es 0 o negativo', () => {
    expect(evaluarAlerta(0, 5), 'stock en 0').to.equal('OUT_OF_STOCK')
    expect(evaluarAlerta(-1, 5), 'stock negativo, dato inconsistente pero no debe explotar')
      .to.equal('OUT_OF_STOCK')
  })

  it('el mensaje de stock bajo usa singular cuando queda exactamente una unidad', () => {
    // Assert: texto fluido, dos afirmaciones sobre el mismo string.
    expect(mensajeAlerta('LOW_STOCK', 'iPhone 13', 1, 5), 'mensaje con 1 unidad')
      .to.include('1 unidad')
      .and.not.include('1 unidades')
  })

  it('el mensaje de sin stock no menciona la cantidad', () => {
    expect(mensajeAlerta('OUT_OF_STOCK', 'Galaxy S24', 0, 5), 'mensaje sin stock')
      .to.match(/^"Galaxy S24" se quedó sin unidades\.$/)
  })
})

describe('AppError — excepciones fluidas', () => {
  it('conserva el statusCode y el mensaje con los que se crea', () => {
    // Act
    const construir = () => {
      throw new AppError('No puedes cambiar tu propio rol', 400)
    }

    // Assert: tipo y mensaje de la excepción, igual que en el ejemplo de
    // referencia (`to.throw(Error, mensaje)`).
    expect(construir, 'guarda de auto-protección de changeUserRole')
      .to.throw(AppError, 'No puedes cambiar tu propio rol')
  })
})
