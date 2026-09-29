import { expect } from 'chai'
import { describe, it } from 'vitest'
import {
  MARGEN_PRECIO,
  PESO_CATEGORIA,
  PESO_MARCA,
  PESO_PRECIO,
  afinidad,
  ordenarPorAfinidad,
  rangoDePrecio,
  type CelularComparable,
} from '../../../src/domain/recomendaciones'

/**
 * Reglas de la recomendación de productos, aisladas de Express y de Prisma.
 *
 * El escenario ESC-13 recorre la funcionalidad completa por HTTP; aquí se
 * fijan las reglas en sí, que es donde están los valores límite: el borde
 * exacto del rango de precio y el orden cuando dos candidatos empatan.
 */

function comparable(cambios: Partial<CelularComparable> = {}): CelularComparable {
  return {
    id: 'candidato',
    brand: 'Apple',
    categoryId: 'apple',
    price: 1_500_000,
    ...cambios,
  }
}

const BASE = comparable({ id: 'base' })

describe('rangoDePrecio', () => {
  it('abre una ventana del ±25% alrededor del precio', () => {
    // Act
    const rango = rangoDePrecio(1_000_000)

    // Assert
    expect(rango).to.deep.equal({ min: 750_000, max: 1_250_000 })
  })

  it('devuelve enteros, porque la columna price lo es', () => {
    // Act
    const { min, max } = rangoDePrecio(999_999)

    // Assert
    expect(Number.isInteger(min), 'mínimo entero').to.be.true
    expect(Number.isInteger(max), 'máximo entero').to.be.true
  })

  it('el margen es el declarado en el dominio, no un número suelto', () => {
    // Arrange
    const precio = 2_000_000

    // Act
    const { min, max } = rangoDePrecio(precio)

    // Assert
    expect(min).to.equal(precio * (1 - MARGEN_PRECIO))
    expect(max).to.equal(precio * (1 + MARGEN_PRECIO))
  })
})

describe('afinidad — cuántos puntos gana un candidato', () => {
  it('coincidir en todo da el máximo', () => {
    // Act
    const puntos = afinidad(BASE, comparable())

    // Assert
    expect(puntos).to.equal(PESO_MARCA + PESO_CATEGORIA + PESO_PRECIO)
  })

  it('no coincidir en nada da cero', () => {
    // Arrange
    const ajeno = comparable({
      brand: 'Xiaomi',
      categoryId: 'android',
      price: 300_000,
    })

    // Act
    const puntos = afinidad(BASE, ajeno)

    // Assert
    expect(puntos).to.equal(0)
  })

  it('la marca pesa más que la categoría, y la categoría más que el precio', () => {
    // Arrange
    const soloMarca = comparable({ categoryId: 'tablets', price: 300_000 })
    const soloCategoria = comparable({ brand: 'Samsung', price: 300_000 })
    const soloPrecio = comparable({ brand: 'Samsung', categoryId: 'android' })

    // Act
    const porMarca = afinidad(BASE, soloMarca)
    const porCategoria = afinidad(BASE, soloCategoria)
    const porPrecio = afinidad(BASE, soloPrecio)

    // Assert
    expect(porMarca, 'puntos por marca').to.equal(PESO_MARCA).and.be.above(porCategoria)
    expect(porCategoria, 'puntos por categoría').to.equal(PESO_CATEGORIA).and.be.above(porPrecio)
    expect(porPrecio, 'puntos por precio').to.equal(PESO_PRECIO)
  })

  it('la marca se compara sin distinguir mayúsculas', () => {
    // Arrange
    // La consulta trae los candidatos con mode: 'insensitive', así que si la
    // puntuación sí distinguiera, "apple" entraría en la lista con 0 puntos
    // por marca y quedaría relegado frente a otro peor.
    const enMayusculas = comparable({ brand: 'APPLE' })
    const comoEnLaBase = comparable({ brand: 'Apple' })

    // Act
    const puntos = afinidad(BASE, enMayusculas)

    // Assert
    expect(puntos).to.equal(afinidad(BASE, comoEnLaBase))
  })

  describe('bordes del rango de precio', () => {
    const { min, max } = rangoDePrecio(BASE.price)
    const fuera = comparable({ brand: 'Samsung', categoryId: 'android' })

    it('el mínimo exacto cuenta como dentro', () => {
      // Act
      const puntos = afinidad(BASE, { ...fuera, price: min })

      // Assert
      expect(puntos).to.equal(PESO_PRECIO)
    })

    it('un peso por debajo del mínimo ya no', () => {
      // Act
      const puntos = afinidad(BASE, { ...fuera, price: min - 1 })

      // Assert
      expect(puntos).to.equal(0)
    })

    it('el máximo exacto cuenta como dentro', () => {
      // Act
      const puntos = afinidad(BASE, { ...fuera, price: max })

      // Assert
      expect(puntos).to.equal(PESO_PRECIO)
    })

    it('un peso por encima del máximo ya no', () => {
      // Act
      const puntos = afinidad(BASE, { ...fuera, price: max + 1 })

      // Assert
      expect(puntos).to.equal(0)
    })
  })
})

describe('ordenarPorAfinidad', () => {
  it('sin candidatos devuelve una lista vacía', () => {
    // Act
    const lista = ordenarPorAfinidad(BASE, [], 4)

    // Assert
    expect(lista).to.be.an('array').that.is.empty
  })

  it('ordena de más afín a menos', () => {
    // Arrange
    const candidatos = [
      comparable({ id: 'nada', brand: 'Xiaomi', categoryId: 'android', price: 300_000 }),
      comparable({ id: 'todo' }),
      comparable({ id: 'marca', categoryId: 'tablets', price: 300_000 }),
    ]

    // Act
    const ids = ordenarPorAfinidad(BASE, candidatos, 3).map((c) => c.id)

    // Assert
    expect(ids, 'orden de la recomendación').to.deep.equal(['todo', 'marca', 'nada'])
  })

  it('a igual afinidad gana el de precio más cercano', () => {
    // Arrange
    const candidatos = [
      comparable({ id: 'lejano', price: 1_800_000 }),
      comparable({ id: 'cercano', price: 1_510_000 }),
    ]

    // Act
    const ids = ordenarPorAfinidad(BASE, candidatos, 2).map((c) => c.id)

    // Assert
    expect(ids).to.deep.equal(['cercano', 'lejano'])
  })

  it('recorta al límite pedido', () => {
    // Arrange
    const candidatos = [
      comparable({ id: 'a' }),
      comparable({ id: 'b' }),
      comparable({ id: 'c' }),
    ]

    // Act
    const lista = ordenarPorAfinidad(BASE, candidatos, 1)

    // Assert
    expect(lista).to.have.lengthOf(1)
  })

  it('no modifica el arreglo que recibe', () => {
    // Arrange
    const candidatos = [comparable({ id: 'z', price: 300_000 }), comparable({ id: 'a' })]
    const copia = [...candidatos]

    // Act
    ordenarPorAfinidad(BASE, candidatos, 2)

    // Assert
    expect(candidatos).to.deep.equal(copia)
  })
})
