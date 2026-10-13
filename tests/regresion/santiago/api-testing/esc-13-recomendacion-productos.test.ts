import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../../../src/app'
import { consultaDe, prismaMock } from '../../../helpers/prisma-mock'
import { celular } from '../../../helpers/fixtures'

/**
 * ESC-13 — Recomendación de productos · API testing
 * GET /api/v1/phones/:slug/similares
 *
 * Contrato HTTP del endpoint, igual que api-testing/tests/test_api.py del
 * repositorio del curso: código de estado, forma exacta del JSON, recurso
 * existente e inexistente y validación de la entrada (aquí, `limit`).
 */

const SLUG = 'iphone-15-pro'
const RUTA = (slug: string, query = '') => `/api/v1/phones/${slug}/similares${query}`

// Campos de la ficha resumida (PhoneListItem). Si alguien agrega o quita un
// campo de la proyección del listado, esta lista lo detecta.
const CAMPOS_FICHA = [
  'id', 'slug', 'name', 'brand', 'price', 'compareAt', 'badge', 'stock',
  'condition', 'verified', 'batteryHealth', 'storage', 'ram', 'shortDesc',
  'heroImage', 'category',
]

function conCelularBase() {
  prismaMock.phone.findUnique.mockResolvedValue(
    celular({ id: 'base', slug: SLUG, brand: 'Apple', categoryId: 'apple', price: 1_500_000 }),
  )
}

describe('ESC-13 · API — recomendaciones de un celular', () => {
  it('es pública: responde 200 en JSON sin cabecera Authorization', async () => {
    // Arrange
    conCelularBase()
    prismaMock.phone.findMany.mockResolvedValue([])

    // Act
    const res = await request(app).get(RUTA(SLUG))

    // Assert
    expect(res.status).to.equal(200)
    expect(res.headers['content-type']).to.match(/^application\/json/)
    expect(res.body).to.deep.equal({ data: [] })
  })

  it('cada recomendación trae exactamente los campos de la ficha resumida', async () => {
    // Arrange
    conCelularBase()
    prismaMock.phone.findMany.mockResolvedValue([
      celular({ id: 'similar-1', brand: 'Apple', categoryId: 'apple', price: 1_400_000 }),
    ])

    // Act
    const res = await request(app).get(RUTA(SLUG))

    // Assert
    expect(res.status).to.equal(200)
    expect(res.body.data).to.have.lengthOf(1)
    const ficha = res.body.data[0]
    expect(ficha).to.have.all.keys(CAMPOS_FICHA)
    // La categoría viaja por nombre y no salen datos internos del inventario.
    expect(ficha.category).to.be.a('string')
    expect(ficha).to.not.have.any.keys('categoryId', 'minStock', 'longDesc', 'images')
  })

  it.each([
    ['0', 'cero'],
    ['-3', 'negativo'],
    ['13', 'por encima del tope de 12'],
    ['2.5', 'decimal'],
    ['cuatro', 'texto'],
  ])('limit=%s (%s) → 400 con el error en el campo limit', async (limit) => {
    // Act
    const res = await request(app).get(RUTA(SLUG, `?limit=${limit}`))

    // Assert
    expect(res.status).to.equal(400)
    expect(res.body.error).to.equal('Datos inválidos')
    expect(res.body.errors.map((e: { field: string }) => e.field)).to.deep.equal(['limit'])
  })

  it.each([
    ['1', 'límite inferior', 4],
    ['4', 'el valor por defecto', 16],
    ['12', 'límite superior', 48],
  ])('limit=%s (%s) → 200 y pide %i candidatos a la base', async (limit, _caso, candidatos) => {
    // Arrange
    conCelularBase()
    prismaMock.phone.findMany.mockResolvedValue([])

    // Act
    const res = await request(app).get(RUTA(SLUG, `?limit=${limit}`))

    // Assert
    expect(res.status).to.equal(200)
    expect(consultaDe(prismaMock.phone.findMany)).to.deep.include({ take: candidatos })
  })

  it('un celular que no existe → 404 con un único mensaje de error', async () => {
    // Arrange
    prismaMock.phone.findUnique.mockResolvedValue(null)

    // Act
    const res = await request(app).get(RUTA('celular-que-no-existe'))

    // Assert
    expect(res.status).to.equal(404)
    expect(res.body).to.deep.equal({ error: 'Celular no encontrado' })
  })

  it('un slug mal codificado en la URL → 400 Petición inválida, no 500', async () => {
    // Act
    // "%E0%A4%A" no es una secuencia UTF-8 válida: Express no puede decodificar
    // el parámetro y lanza su propio error 400 antes de llegar al controlador.
    const res = await request(app).get('/api/v1/phones/%E0%A4%A/similares')

    // Assert
    expect(res.status).to.equal(400)
    expect(res.body).to.deep.equal({ error: 'Petición inválida' })
    expect(prismaMock.phone.findUnique.mock.calls).to.be.empty
  })

  it('una ruta mal escrita no cae en la recomendación → 404 Ruta no encontrada', async () => {
    // Act
    const res = await request(app).get(`/api/v1/phones/${SLUG}/similar`)

    // Assert
    expect(res.status).to.equal(404)
    expect(res.body).to.deep.equal({ error: 'Ruta no encontrada' })
    expect(prismaMock.phone.findMany.mock.calls).to.be.empty
  })

  it('es una consulta segura: pedirla dos veces da lo mismo y no escribe nada', async () => {
    // Arrange
    conCelularBase()
    prismaMock.phone.findMany.mockResolvedValue([
      celular({ id: 'similar-1', brand: 'Apple', categoryId: 'apple', price: 1_400_000 }),
    ])

    // Act
    const primera = await request(app).get(RUTA(SLUG))
    const segunda = await request(app).get(RUTA(SLUG))

    // Assert
    expect(segunda.body).to.deep.equal(primera.body)
    expect(prismaMock.phone.update.mock.calls).to.be.empty
    expect(prismaMock.phone.create.mock.calls).to.be.empty
    expect(prismaMock.alert.upsert.mock.calls).to.be.empty
  })
})
