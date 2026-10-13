import { expect } from 'chai'
import { describe, it } from 'vitest'
import {
  PESO_CATEGORIA,
  PESO_MARCA,
  PESO_PRECIO,
  afinidad,
  ordenarPorAfinidad,
  rangoDePrecio,
  type CelularComparable,
} from '../../../../src/domain/recomendaciones'

/**
 * ESC-13 — Recomendación de productos · regression-testing
 *
 * Regresión funcional de las reglas del dominio, con el patrón AAA y los
 * principios FIRST del curso: datos locales en cada prueba (Independent),
 * sin red ni base (Fast), sin azar ni reloj (Repeatable) y siempre con una
 * aserción (Self-validating). Cubre casos normales, valores límite del rango
 * de precio y el orden cuando hay empates.
 */

const BASE: CelularComparable = { id: 'base', brand: 'Apple', categoryId: 'apple', price: 1_500_000 }

/** Un candidato que, salvo lo que se le cambie, no comparte nada con BASE. */
function candidato(cambios: Partial<CelularComparable> = {}): CelularComparable {
  return { id: 'candidato', brand: 'Xiaomi', categoryId: 'android', price: 9_000_000, ...cambios }
}

const ids = (lista: CelularComparable[]) => lista.map((c) => c.id)

describe('ESC-13 · Regresión — reglas de la recomendación', () => {
  describe('Puntaje de afinidad: tabla de verdad de los tres criterios', () => {
    it.each([
      [{ brand: 'Apple', categoryId: 'apple', price: 1_500_000 }, 6, 'marca, categoría y precio'],
      [{ brand: 'Apple', categoryId: 'apple' }, 5, 'marca y categoría'],
      [{ brand: 'Apple', price: 1_500_000 }, 4, 'marca y precio'],
      [{ brand: 'Apple' }, 3, 'solo la marca'],
      [{ categoryId: 'apple', price: 1_500_000 }, 3, 'categoría y precio'],
      [{ categoryId: 'apple' }, 2, 'solo la categoría'],
      [{ price: 1_500_000 }, 1, 'solo el precio'],
      [{}, 0, 'nada en común'],
    ])('%j → %i puntos (%s)', (cambios, esperado, _caso) => {
      // Arrange
      const otro = candidato(cambios)

      // Act
      const puntaje = afinidad(BASE, otro)

      // Assert
      expect(puntaje).to.equal(esperado)
    })

    it('los pesos conservan el orden de la funcionalidad: marca > categoría > precio', () => {
      // Act & Assert
      expect(PESO_MARCA).to.be.above(PESO_CATEGORIA)
      expect(PESO_CATEGORIA).to.be.above(PESO_PRECIO)
      expect(PESO_PRECIO).to.be.above(0)
    })

    it('la marca se compara sin distinguir mayúsculas', () => {
      // Arrange
      const otro = candidato({ brand: 'APPLE' })

      // Act
      const puntaje = afinidad(BASE, otro)

      // Assert
      expect(puntaje).to.equal(PESO_MARCA)
    })

    it('la categoría es un id: sí distingue mayúsculas', () => {
      // Arrange
      const otro = candidato({ categoryId: 'APPLE' })

      // Act
      const puntaje = afinidad(BASE, otro)

      // Assert
      expect(puntaje).to.equal(0)
    })
  })

  describe('Valores límite del rango de precio (±25 %)', () => {
    it('el rango de 1.500.000 va de 1.125.000 a 1.875.000', () => {
      // Act
      const rango = rangoDePrecio(1_500_000)

      // Assert
      expect(rango).to.deep.equal({ min: 1_125_000, max: 1_875_000 })
    })

    it.each([
      [1_124_999, 0, 'un peso por debajo del mínimo'],
      [1_125_000, PESO_PRECIO, 'exactamente el mínimo'],
      [1_500_000, PESO_PRECIO, 'el mismo precio'],
      [1_875_000, PESO_PRECIO, 'exactamente el máximo'],
      [1_875_001, 0, 'un peso por encima del máximo'],
    ])('precio %i → suma %i (%s)', (precio, esperado) => {
      // Arrange
      const otro = candidato({ price: precio })

      // Act
      const puntaje = afinidad(BASE, otro)

      // Assert
      expect(puntaje).to.equal(esperado)
    })
  })

  describe('Orden y recorte de la lista', () => {
    it('ordena de mayor a menor afinidad, sin importar el orden de llegada', () => {
      // Arrange
      const candidatos = [
        candidato({ id: 'uno', price: 1_500_000 }),
        candidato({ id: 'seis', brand: 'Apple', categoryId: 'apple', price: 1_500_000 }),
        candidato({ id: 'tres', brand: 'Apple' }),
      ]

      // Act
      const ordenados = ordenarPorAfinidad(BASE, candidatos, 4)

      // Assert
      expect(ids(ordenados)).to.deep.equal(['seis', 'tres', 'uno'])
    })

    // Los dos casos son necesarios: con uno solo pasaría también un desempate
    // equivocado como "primero el más barato" o "primero el más caro".
    it.each([
      ['el más barato', 1_450_000, 1_600_000], // −50.000 frente a +100.000
      ['el más caro', 1_550_000, 1_400_000], // +50.000 frente a −100.000
    ])('a igual afinidad gana el de precio más cercano, aunque sea %s', (_caso, precioCercano, precioLejano) => {
      // Arrange
      const candidatos = [
        candidato({ id: 'lejano', brand: 'Apple', price: precioLejano }),
        candidato({ id: 'cercano', brand: 'Apple', price: precioCercano }),
      ]

      // Act
      const ordenados = ordenarPorAfinidad(BASE, candidatos, 4)

      // Assert
      expect(ids(ordenados)).to.deep.equal(['cercano', 'lejano'])
    })

    it.each([
      [0, 0],
      [3, 3],
      [10, 4],
    ])('con %i candidatos y límite 4 devuelve %i', (cantidad, esperado) => {
      // Arrange
      const candidatos = Array.from({ length: cantidad }, (_, i) => candidato({ id: `c-${i}` }))

      // Act
      const ordenados = ordenarPorAfinidad(BASE, candidatos, 4)

      // Assert
      expect(ordenados).to.have.lengthOf(esperado)
    })

    it('no modifica el arreglo que recibe (no tiene efectos secundarios)', () => {
      // Arrange
      const candidatos = [candidato({ id: 'a' }), candidato({ id: 'b', brand: 'Apple' })]
      const copia = [...candidatos]

      // Act
      ordenarPorAfinidad(BASE, candidatos, 4)

      // Assert
      expect(candidatos).to.deep.equal(copia)
    })
  })
})
