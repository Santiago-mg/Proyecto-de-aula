import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { prismaMock } from '../helpers/prisma-mock'
import { celular } from '../helpers/fixtures'

/**
 * ESC-13 — Recomendación de productos
 * GET /api/v1/phones/:slug/similares
 *
 * Un camino por cada arista del grafo de flujo de la funcionalidad 13. Los
 * nombres llevan la secuencia de nodos entre paréntesis para que cada prueba
 * se pueda cruzar con la hoja "Caminos ESC-13" del Excel.
 *
 * Es una ruta pública, como el detalle del catálogo: no pasa por
 * auth.middleware, así que el grafo arranca directamente en la validación del
 * parámetro `limit`.
 *
 *  1  ¿limit pasa similarQueryDto?            8  suma 3 puntos
 *  2  responde 400 Datos inválidos            9  ¿comparte categoría?
 *  3  ¿existe un celular con ese slug?       10  suma 2 puntos
 *  4  responde 404 Celular no encontrado     11  ¿el precio está en el ±25%?
 *  5  consulta los candidatos                12  suma 1 punto
 *  6  ¿queda algún candidato por puntuar?    13  ordena y recorta a limit
 *  7  ¿comparte marca?                       14  responde 200
 *                                            15  fin
 */

const BASE = '/api/v1/phones'
const RUTA = (slug: string, query = '') => `${BASE}/${slug}/similares${query}`

const SLUG = 'iphone-15-pro'
const PRECIO_BASE = 1_500_000
// rangoDePrecio(1.500.000) = [1.125.000, 1.875.000]
const PRECIO_DENTRO = 1_400_000
const PRECIO_FUERA = 2_500_000

/** El celular que el cliente está viendo. */
function base() {
  return celular({
    id: 'base-id',
    slug: SLUG,
    brand: 'Apple',
    categoryId: 'apple',
    price: PRECIO_BASE,
  })
}

/** Deja programado el celular base para que findBySlug lo encuentre. */
function conBase() {
  prismaMock.phone.findUnique.mockResolvedValue(base())
}

describe('Camino 1 (1-2-15): el parámetro limit no es válido', () => {
  it('limit = 0 → 400 Datos inválidos', async () => {
    const res = await request(app).get(RUTA(SLUG, '?limit=0'))

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Datos inválidos')
    // La guarda corta antes de tocar la base: ni se busca el celular base.
    expect(prismaMock.phone.findUnique).not.toHaveBeenCalled()
    expect(prismaMock.phone.findMany).not.toHaveBeenCalled()
  })

  it('limit por encima del tope → 400, el endpoint no es un volcado del catálogo', async () => {
    const res = await request(app).get(RUTA(SLUG, '?limit=50'))

    expect(res.status).toBe(400)
    expect(res.body.errors).toEqual([
      { field: 'limit', message: 'No se pueden pedir más de 12 recomendaciones' },
    ])
  })

  it('limit que no es un número → 400', async () => {
    const res = await request(app).get(RUTA(SLUG, '?limit=cuatro'))

    expect(res.status).toBe(400)
    expect(prismaMock.phone.findMany).not.toHaveBeenCalled()
  })
})

describe('Camino 2 (1-3-4-15): el celular base no existe', () => {
  it('slug que no está en el catálogo → 404 Celular no encontrado', async () => {
    prismaMock.phone.findUnique.mockResolvedValue(null)

    const res = await request(app).get(RUTA('celular-que-no-existe'))

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Celular no encontrado')
    // Sin celular base no hay con qué comparar: no se consultan candidatos.
    expect(prismaMock.phone.findMany).not.toHaveBeenCalled()
  })
})

describe('Camino 3 (1-3-5-6-13-14-15): no hay candidatos', () => {
  it('el catálogo no tiene nada parecido → 200 con lista vacía', async () => {
    conBase()
    prismaMock.phone.findMany.mockResolvedValue([])

    const res = await request(app).get(RUTA(SLUG))

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })
})

describe('Puntuación de un candidato (caminos 4 a 7)', () => {
  beforeEach(conBase)

  /** Pide las recomendaciones con un único candidato y devuelve la respuesta. */
  async function conUnCandidato(candidato: ReturnType<typeof celular>) {
    prismaMock.phone.findMany.mockResolvedValue([candidato])
    return request(app).get(RUTA(SLUG))
  }

  it('Camino 4 (1-3-5-6-7-8-9-10-11-12-6-13-14-15): coincide en marca, categoría y precio', async () => {
    const res = await conUnCandidato(
      celular({
        id: 'afin-total',
        name: 'iPhone 14 Pro',
        brand: 'Apple',
        categoryId: 'apple',
        price: PRECIO_DENTRO,
      }),
    )

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0]).toMatchObject({
      id: 'afin-total',
      name: 'iPhone 14 Pro',
      brand: 'Apple',
      // La ficha resumida: la categoría viaja por nombre, no por id.
      category: 'apple',
    })
  })

  it('Camino 5 (1-3-5-6-7-9-10-11-12-6-13-14-15): otra marca, misma categoría y precio', async () => {
    const res = await conUnCandidato(
      celular({
        id: 'otra-marca',
        brand: 'Samsung',
        categoryId: 'apple',
        price: PRECIO_DENTRO,
      }),
    )

    expect(res.status).toBe(200)
    expect(res.body.data[0].id).toBe('otra-marca')
  })

  it('Camino 6 (1-3-5-6-7-8-9-11-12-6-13-14-15): misma marca, otra categoría, precio dentro', async () => {
    const res = await conUnCandidato(
      celular({
        id: 'otra-categoria',
        brand: 'Apple',
        categoryId: 'tablets',
        price: PRECIO_DENTRO,
      }),
    )

    expect(res.status).toBe(200)
    expect(res.body.data[0].id).toBe('otra-categoria')
  })

  it('Camino 7 (1-3-5-6-7-8-9-10-11-6-13-14-15): marca y categoría iguales, precio fuera del rango', async () => {
    const res = await conUnCandidato(
      celular({
        id: 'precio-fuera',
        brand: 'Apple',
        categoryId: 'apple',
        price: PRECIO_FUERA,
      }),
    )

    expect(res.status).toBe(200)
    expect(res.body.data[0].id).toBe('precio-fuera')
  })
})

describe('Orden y recorte de la lista (nodo 13)', () => {
  beforeEach(conBase)

  it('primero el de más afinidad, aunque la base lo devuelva de último', async () => {
    prismaMock.phone.findMany.mockResolvedValue([
      // 1 punto: solo el precio.
      celular({ id: 'solo-precio', brand: 'Xiaomi', categoryId: 'android', price: PRECIO_DENTRO }),
      // 6 puntos: marca, categoría y precio.
      celular({ id: 'todo', brand: 'Apple', categoryId: 'apple', price: PRECIO_DENTRO }),
      // 3 puntos: solo la marca.
      celular({ id: 'solo-marca', brand: 'Apple', categoryId: 'tablets', price: PRECIO_FUERA }),
    ])

    const res = await request(app).get(RUTA(SLUG))

    expect(res.body.data.map((p: { id: string }) => p.id)).toEqual([
      'todo',
      'solo-marca',
      'solo-precio',
    ])
  })

  it('a igual afinidad, primero el de precio más cercano', async () => {
    prismaMock.phone.findMany.mockResolvedValue([
      celular({ id: 'lejano', brand: 'Apple', categoryId: 'apple', price: 1_850_000 }),
      celular({ id: 'cercano', brand: 'Apple', categoryId: 'apple', price: 1_520_000 }),
    ])

    const res = await request(app).get(RUTA(SLUG))

    // Los dos suman 6 puntos, así que desempata la diferencia de precio.
    expect(res.body.data.map((p: { id: string }) => p.id)).toEqual([
      'cercano',
      'lejano',
    ])
  })

  it('devuelve como mucho las que se piden', async () => {
    prismaMock.phone.findMany.mockResolvedValue([
      celular({ id: 'a', brand: 'Apple', categoryId: 'apple', price: PRECIO_DENTRO }),
      celular({ id: 'b', brand: 'Apple', categoryId: 'apple', price: PRECIO_DENTRO }),
      celular({ id: 'c', brand: 'Apple', categoryId: 'apple', price: PRECIO_DENTRO }),
    ])

    const res = await request(app).get(RUTA(SLUG, '?limit=2'))

    expect(res.body.data).toHaveLength(2)
  })
})

describe('Consulta de candidatos (nodo 5)', () => {
  beforeEach(() => {
    conBase()
    prismaMock.phone.findMany.mockResolvedValue([])
  })

  it('descarta el propio celular y los agotados, y busca por marca, categoría o precio', async () => {
    await request(app).get(RUTA(SLUG))

    expect(prismaMock.phone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { not: 'base-id' },
          stock: { gt: 0 },
          OR: [
            { brand: { equals: 'Apple', mode: 'insensitive' } },
            { categoryId: 'apple' },
            // ±25% de 1.500.000
            { price: { gte: 1_125_000, lte: 1_875_000 } },
          ],
        },
      }),
    )
  })

  it('sin limit se piden 4, que es lo que cabe en la fila de la ficha', async () => {
    await request(app).get(RUTA(SLUG))

    // Se traen candidatos de más (4 por cada uno pedido) porque el orden por
    // afinidad lo pone el dominio, no la base.
    expect(prismaMock.phone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 16 }),
    )
  })

  it('con limit explícito se piden candidatos en proporción', async () => {
    await request(app).get(RUTA(SLUG, '?limit=3'))

    expect(prismaMock.phone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 12 }),
    )
  })
})

describe('Fallos de infraestructura', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('si se cae la consulta de candidatos → 500 sin filtrar el detalle', async () => {
    conBase()
    prismaMock.phone.findMany.mockRejectedValue(new Error('timeout'))

    const res = await request(app).get(RUTA(SLUG))

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Error interno del servidor')
  })
})
