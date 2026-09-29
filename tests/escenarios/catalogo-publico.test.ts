import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { consultaDe, prismaMock } from '../helpers/prisma-mock'
import { autenticar, autenticarAdmin, celular } from '../helpers/fixtures'

/**
 * Catálogo público
 * GET /phones · GET /phones/:slug · GET /phones/id/:id
 *
 * Además de los controladores, cubre buildWhere() de PhoneRepository: cada
 * filtro del query se traduce a una parte distinta del WHERE.
 */

const RUTA = '/api/v1/phones'

/** Fila reducida tal como la pide el select del listado. */
function filaListado(cambios: Record<string, unknown> = {}) {
  return {
    id: 'tel-1',
    slug: 'telefono-1',
    name: 'Teléfono 1',
    brand: 'Apple',
    price: 1_000_000,
    compareAt: null,
    badge: null,
    stock: 3,
    condition: 'NEW',
    verified: true,
    batteryHealth: null,
    storage: '128GB',
    ram: '6GB',
    shortDesc: null,
    heroImage: null,
    category: { name: 'Apple' },
    ...cambios,
  }
}

describe('GET /phones — listado público', () => {
  it('sin filtros → 200 con la lista paginada y el WHERE vacío', async () => {
    // Arrange
    prismaMock.phone.count.mockResolvedValue(1)
    prismaMock.phone.findMany.mockResolvedValue([filaListado()])

    // Act
    const res = await request(app).get(RUTA)

    // Assert
    expect(consultaDe(prismaMock.phone.findMany)).to.deep.include({ where: {}, skip: 0, take: 12 })
    expect(res.status).to.equal(200)
    expect(res.body.data).to.have.lengthOf(1)
    expect(res.body.meta).to.deep.include({ total: 1, page: 1, limit: 12 })
  })

  it('limit fuera de rango → 400 Datos inválidos', async () => {
    // Act
    // El esquema tope el limit en 50.
    const res = await request(app).get(`${RUTA}?limit=51`)

    // Assert
    expect(res.status).to.equal(400)
    expect(res.body.error).to.equal('Datos inválidos')
    expect(prismaMock.phone.findMany.mock.calls).to.be.empty
  })

  it('verified=false filtra por los NO verificados', async () => {
    // Arrange
    prismaMock.phone.count.mockResolvedValue(0)
    prismaMock.phone.findMany.mockResolvedValue([])

    // Act
    await request(app).get(`${RUTA}?verified=false`)

    // Assert
    // Con z.coerce.boolean() esto llegaba como true y filtraba al revés.
    expect(consultaDe(prismaMock.phone.findMany)).to.deep.include({ where: { verified: false } })
  })

  it('verified con un valor que no es true/false → 400', async () => {
    // Act
    const res = await request(app).get(`${RUTA}?verified=quizas`)

    // Assert
    expect(res.status).to.equal(400)
  })

  it('cada filtro se traduce a su parte del WHERE', async () => {
    // Arrange
    prismaMock.phone.count.mockResolvedValue(0)
    prismaMock.phone.findMany.mockResolvedValue([])

    // Act
    await request(app).get(
      `${RUTA}?category=apple&brand=Apple&condition=NEW&minPrice=100000&maxPrice=2000000&search=iphone`,
    )

    // Assert
    expect(consultaDe(prismaMock.phone.findMany)).to.deep.include({
      where: {
        categoryId: 'apple',
        brand: { equals: 'Apple', mode: 'insensitive' },
        condition: 'NEW',
        price: { gte: 100_000, lte: 2_000_000 },
        OR: [
          { name: { contains: 'iphone', mode: 'insensitive' } },
          { brand: { contains: 'iphone', mode: 'insensitive' } },
          { shortDesc: { contains: 'iphone', mode: 'insensitive' } },
        ],
      },
    })
  })

  it('la segunda página salta los resultados de la primera', async () => {
    // Arrange
    prismaMock.phone.count.mockResolvedValue(30)
    prismaMock.phone.findMany.mockResolvedValue([])

    // Act
    const res = await request(app).get(`${RUTA}?page=3&limit=10`)

    // Assert
    expect(consultaDe(prismaMock.phone.findMany)).to.deep.include({ skip: 20, take: 10 })
    expect(res.body.meta).to.deep.include({ total: 30, totalPages: 3 })
  })
})

describe('GET /phones/:slug — detalle público', () => {
  it('slug inexistente → 404', async () => {
    // Arrange
    prismaMock.phone.findUnique.mockResolvedValue(null)

    // Act
    const res = await request(app).get(`${RUTA}/no-existe`)

    // Assert
    expect(res.status).to.equal(404)
    expect(res.body.error).to.equal('Celular no encontrado')
  })

  it('slug existente → 200 con el celular y sus relaciones', async () => {
    // Arrange
    const telefono = celular({ slug: 'iphone-15' })
    prismaMock.phone.findUnique.mockResolvedValue(telefono)

    // Act
    const res = await request(app).get(`${RUTA}/iphone-15`)

    // Assert
    expect(consultaDe(prismaMock.phone.findUnique)).to.deep.include({ where: { slug: 'iphone-15' } })
    expect(res.status).to.equal(200)
    expect(res.body.data).to.deep.include({ slug: 'iphone-15' })
  })
})

describe('GET /phones/id/:id — detalle por UUID (solo admin)', () => {
  it('sin token → 401', async () => {
    // Act
    const res = await request(app).get(`${RUTA}/id/tel-1`)

    // Assert
    expect(res.status).to.equal(401)
  })

  it('rol USER → 403: expone el registro crudo, así que no es pública', async () => {
    // Arrange
    const { token } = autenticar()

    // Act
    const res = await request(app)
      .get(`${RUTA}/id/tel-1`)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(403)
  })

  it('admin con id inexistente → 404', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.phone.findUnique.mockResolvedValue(null)

    // Act
    const res = await request(app)
      .get(`${RUTA}/id/tel-1`)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(404)
  })

  it('admin con id existente → 200', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const telefono = celular()
    prismaMock.phone.findUnique.mockResolvedValue(telefono)

    // Act
    const res = await request(app)
      .get(`${RUTA}/id/${telefono.id}`)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(200)
    expect(res.body.data.id).to.equal(telefono.id)
  })
})

describe('Rutas que no existen', () => {
  it('devuelve 404 Ruta no encontrada', async () => {
    // Act
    const res = await request(app).get('/api/v1/inventado')

    // Assert
    expect(res.status).to.equal(404)
    expect(res.body.error).to.equal('Ruta no encontrada')
  })

  it('/health responde ok', async () => {
    // Act
    const res = await request(app).get('/health')

    // Assert
    expect(res.status).to.equal(200)
    expect(res.body.status).to.equal('ok')
  })
})
