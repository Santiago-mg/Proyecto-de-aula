import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../../../src/app'
import { prismaMock } from '../../../helpers/prisma-mock'
import { celular } from '../../../helpers/fixtures'
import {
  afinidad,
  ordenarPorAfinidad,
  type CelularComparable,
} from '../../../../src/domain/recomendaciones'
import { mediana, medir, repetir } from '../helpers/medicion'

/**
 * ESC-13 — Recomendación de productos · performance-testing
 *
 * Misma estructura que performance-testing/tests/test_performance.py del
 * curso: primero que el resultado sea correcto, luego que la entrada inválida
 * se rechace, después un presupuesto de tiempo amplio y por último la
 * comparación de dos implementaciones con la mediana de cinco mediciones.
 *
 * Las dos implementaciones que se comparan hacen lo mismo:
 *   - ordenarPorAfinidad (la del dominio) puntúa cada candidato UNA vez y
 *     después ordena: n llamadas a afinidad().
 *   - ordenarIngenuo (referencia, solo existe aquí) recalcula la afinidad
 *     dentro del comparador: unas 2·n·log n llamadas.
 * Si alguien "simplifica" el dominio a la versión ingenua, lo detectan dos
 * pruebas: una que cuenta cuántas veces se lee la marca de cada candidato
 * (determinista, no depende de la máquina) y la comparación por mediana.
 */

const PRESUPUESTO_MS = 500 // 0,5 s: el mismo presupuesto amplio del ejemplo del curso

const BASE: CelularComparable = { id: 'base', brand: 'Apple', categoryId: 'apple', price: 1_500_000 }

const MARCAS = ['Apple', 'Samsung', 'Xiaomi', 'Motorola']
const CATEGORIAS = ['apple', 'samsung', 'xiaomi', 'motorola', 'android']

/**
 * Catálogo sintético determinista: los mismos n celulares en cada corrida
 * (FIRST: Repeatable). No usa Math.random.
 */
function catalogoSintetico(n: number): CelularComparable[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `celular-${i}`,
    brand: MARCAS[i % MARCAS.length],
    categoryId: CATEGORIAS[(i * 7) % CATEGORIAS.length],
    price: 500_000 + ((i * 7919) % 3_000_000),
  }))
}

function ordenarIngenuo<T extends CelularComparable>(base: CelularComparable, candidatos: T[], limite: number): T[] {
  return [...candidatos]
    .sort(
      (a, b) =>
        afinidad(base, b) - afinidad(base, a) ||
        Math.abs(a.price - base.price) - Math.abs(b.price - base.price),
    )
    .slice(0, limite)
}

const ids = (lista: CelularComparable[]) => lista.map((c) => c.id)

/**
 * Envuelve cada candidato para contar cuántas veces alguien lee su marca.
 * afinidad() lee `candidato.brand` exactamente una vez por llamada, así que
 * el contador dice cuántas veces se puntuó a cada candidato.
 */
function conLecturasDeMarcaContadas(candidatos: CelularComparable[]) {
  let lecturas = 0
  const espiados = candidatos.map(({ brand, ...resto }) =>
    Object.defineProperty({ ...resto }, 'brand', {
      enumerable: true,
      get: () => {
        lecturas++
        return brand
      },
    }) as CelularComparable,
  )
  return { espiados, lecturas: () => lecturas }
}

describe('ESC-13 · Performance — recomendaciones', () => {
  it.each([0, 1, 10, 1_000])('con %i candidatos las dos implementaciones dan el mismo resultado', (n) => {
    // Arrange
    const candidatos = catalogoSintetico(n)

    // Act
    const delDominio = ordenarPorAfinidad(BASE, candidatos, 12)
    const ingenuo = ordenarIngenuo(BASE, candidatos, 12)

    // Assert
    expect(ids(delDominio)).to.deep.equal(ids(ingenuo))
  })

  it('un limit inválido se rechaza sin hacer ninguna consulta', async () => {
    // Act
    const res = await request(app).get('/api/v1/phones/iphone-15-pro/similares?limit=0')

    // Assert
    expect(res.status).to.equal(400)
    expect(prismaMock.phone.findUnique.mock.calls).to.be.empty
    expect(prismaMock.phone.findMany.mock.calls).to.be.empty
  })

  it('ordenar 20.000 candidatos cumple el presupuesto educativo', async () => {
    // Arrange
    const candidatos = catalogoSintetico(20_000)
    ordenarPorAfinidad(BASE, candidatos, 12) // calentamiento del JIT

    // Act
    const { resultado, ms } = await medir(() => ordenarPorAfinidad(BASE, candidatos, 12))

    // Assert
    expect(resultado).to.have.lengthOf(12)
    expect(ms, `La operación tardó ${ms.toFixed(3)} ms`).to.be.below(PRESUPUESTO_MS)
  })

  it('el endpoint con el máximo de candidatos (48) cumple el presupuesto', async () => {
    // Arrange
    prismaMock.phone.findUnique.mockResolvedValue(celular({ slug: 'iphone-15-pro', brand: 'Apple', price: 1_500_000 }))
    prismaMock.phone.findMany.mockResolvedValue(
      Array.from({ length: 48 }, (_, i) => celular({ id: `c-${i}`, brand: MARCAS[i % 4], price: 1_000_000 + i * 20_000 })),
    )
    const pedir = () => request(app).get('/api/v1/phones/iphone-15-pro/similares?limit=12')
    await pedir() // calentamiento: la primera petición compila rutas y middlewares

    // Act
    const { resultado: res, ms } = await medir(pedir)

    // Assert
    expect(res.status).to.equal(200)
    expect(res.body.data).to.have.lengthOf(12)
    expect(ms, `La petición tardó ${ms.toFixed(3)} ms`).to.be.below(PRESUPUESTO_MS)
  })

  it('con 48 candidatos sigue haciendo exactamente 2 consultas (sin N+1)', async () => {
    // Arrange
    // El tope de candidatos (limit=12 → 48): si el código consultara algo por
    // cada candidato, aquí se verían 48 consultas de más.
    prismaMock.phone.findUnique.mockResolvedValue(celular({ slug: 'iphone-15-pro', brand: 'Apple', price: 1_500_000 }))
    prismaMock.phone.findMany.mockResolvedValue(
      Array.from({ length: 48 }, (_, i) => celular({ id: `c-${i}`, brand: MARCAS[i % 4], price: 1_000_000 + i * 20_000 })),
    )

    // Act
    const res = await request(app).get('/api/v1/phones/iphone-15-pro/similares?limit=12')

    // Assert
    // Una para el celular base y otra para los candidatos: nada de una
    // consulta por candidato (N+1) ni de leer el catálogo completo.
    expect(res.body.data).to.have.lengthOf(12)
    expect(prismaMock.phone.findUnique.mock.calls).to.have.lengthOf(1)
    expect(prismaMock.phone.findMany.mock.calls).to.have.lengthOf(1)
    expect(prismaMock.phone.count.mock.calls).to.be.empty
  })

  it.each([100, 5_000])('con %i candidatos cada uno se puntúa una sola vez', (n) => {
    // Arrange
    const { espiados, lecturas } = conLecturasDeMarcaContadas(catalogoSintetico(n))

    // Act
    ordenarPorAfinidad(BASE, espiados, 12)

    // Assert
    // Exactamente n: la versión ingenua (afinidad dentro del comparador)
    // haría del orden de 2·n·log n lecturas.
    expect(lecturas()).to.equal(n)
  })

  it('el contador sí distingue la versión ingenua (control del instrumento)', () => {
    // Arrange
    const n = 100
    const { espiados, lecturas } = conLecturasDeMarcaContadas(catalogoSintetico(n))

    // Act
    ordenarIngenuo(BASE, espiados, 12)

    // Assert
    // Si esta prueba fallara, la anterior no estaría midiendo nada.
    expect(lecturas()).to.be.above(2 * n)
  })

  it('puntuar una vez por candidato es más rápido que recalcular en el comparador', async () => {
    // Arrange
    const candidatos = catalogoSintetico(20_000)

    // Act
    const tiemposDominio = await repetir(() => ordenarPorAfinidad(BASE, candidatos, 12), 5)
    const tiemposIngenuo = await repetir(() => ordenarIngenuo(BASE, candidatos, 12), 5)

    // Assert
    expect(mediana(tiemposDominio)).to.be.below(mediana(tiemposIngenuo))
  })
})
