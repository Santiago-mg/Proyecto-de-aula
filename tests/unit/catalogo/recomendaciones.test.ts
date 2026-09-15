import { describe, expect, it } from 'vitest'
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
    expect(rangoDePrecio(1_000_000)).toEqual({ min: 750_000, max: 1_250_000 })
  })

  it('devuelve enteros, porque la columna price lo es', () => {
    const { min, max } = rangoDePrecio(999_999)

    expect(Number.isInteger(min)).toBe(true)
    expect(Number.isInteger(max)).toBe(true)
  })

  it('el margen es el declarado en el dominio, no un número suelto', () => {
    const precio = 2_000_000
    const { min, max } = rangoDePrecio(precio)

    expect(min).toBe(precio * (1 - MARGEN_PRECIO))
    expect(max).toBe(precio * (1 + MARGEN_PRECIO))
  })
})

describe('afinidad — cuántos puntos gana un candidato', () => {
  it('coincidir en todo da el máximo', () => {
    expect(afinidad(BASE, comparable())).toBe(
      PESO_MARCA + PESO_CATEGORIA + PESO_PRECIO,
    )
  })

  it('no coincidir en nada da cero', () => {
    const ajeno = comparable({
      brand: 'Xiaomi',
      categoryId: 'android',
      price: 300_000,
    })

    expect(afinidad(BASE, ajeno)).toBe(0)
  })

  it('la marca pesa más que la categoría, y la categoría más que el precio', () => {
    const soloMarca = comparable({ categoryId: 'tablets', price: 300_000 })
    const soloCategoria = comparable({ brand: 'Samsung', price: 300_000 })
    const soloPrecio = comparable({ brand: 'Samsung', categoryId: 'android' })

    expect(afinidad(BASE, soloMarca)).toBe(PESO_MARCA)
    expect(afinidad(BASE, soloCategoria)).toBe(PESO_CATEGORIA)
    expect(afinidad(BASE, soloPrecio)).toBe(PESO_PRECIO)
    expect(afinidad(BASE, soloMarca)).toBeGreaterThan(afinidad(BASE, soloCategoria))
    expect(afinidad(BASE, soloCategoria)).toBeGreaterThan(afinidad(BASE, soloPrecio))
  })

  it('la marca se compara sin distinguir mayúsculas', () => {
    // La consulta trae los candidatos con mode: 'insensitive', así que si la
    // puntuación sí distinguiera, "apple" entraría en la lista con 0 puntos
    // por marca y quedaría relegado frente a otro peor.
    expect(afinidad(BASE, comparable({ brand: 'APPLE' }))).toBe(
      afinidad(BASE, comparable({ brand: 'Apple' })),
    )
  })

  describe('bordes del rango de precio', () => {
    const { min, max } = rangoDePrecio(BASE.price)
    const fuera = comparable({ brand: 'Samsung', categoryId: 'android' })

    it('el mínimo exacto cuenta como dentro', () => {
      expect(afinidad(BASE, { ...fuera, price: min })).toBe(PESO_PRECIO)
    })

    it('un peso por debajo del mínimo ya no', () => {
      expect(afinidad(BASE, { ...fuera, price: min - 1 })).toBe(0)
    })

    it('el máximo exacto cuenta como dentro', () => {
      expect(afinidad(BASE, { ...fuera, price: max })).toBe(PESO_PRECIO)
    })

    it('un peso por encima del máximo ya no', () => {
      expect(afinidad(BASE, { ...fuera, price: max + 1 })).toBe(0)
    })
  })
})

describe('ordenarPorAfinidad', () => {
  it('sin candidatos devuelve una lista vacía', () => {
    expect(ordenarPorAfinidad(BASE, [], 4)).toEqual([])
  })

  it('ordena de más afín a menos', () => {
    const candidatos = [
      comparable({ id: 'nada', brand: 'Xiaomi', categoryId: 'android', price: 300_000 }),
      comparable({ id: 'todo' }),
      comparable({ id: 'marca', categoryId: 'tablets', price: 300_000 }),
    ]

    expect(ordenarPorAfinidad(BASE, candidatos, 3).map((c) => c.id)).toEqual([
      'todo',
      'marca',
      'nada',
    ])
  })

  it('a igual afinidad gana el de precio más cercano', () => {
    const candidatos = [
      comparable({ id: 'lejano', price: 1_800_000 }),
      comparable({ id: 'cercano', price: 1_510_000 }),
    ]

    expect(ordenarPorAfinidad(BASE, candidatos, 2).map((c) => c.id)).toEqual([
      'cercano',
      'lejano',
    ])
  })

  it('recorta al límite pedido', () => {
    const candidatos = [
      comparable({ id: 'a' }),
      comparable({ id: 'b' }),
      comparable({ id: 'c' }),
    ]

    expect(ordenarPorAfinidad(BASE, candidatos, 1)).toHaveLength(1)
  })

  it('no modifica el arreglo que recibe', () => {
    const candidatos = [comparable({ id: 'z', price: 300_000 }), comparable({ id: 'a' })]
    const copia = [...candidatos]

    ordenarPorAfinidad(BASE, candidatos, 2)

    expect(candidatos).toEqual(copia)
  })
})
