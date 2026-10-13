import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../../../src/app'
import { prismaMock } from '../../../helpers/prisma-mock'
import {
  ID_INEXISTENTE,
  autenticarAdmin,
  bodyCelularValido,
  celular,
} from '../../../helpers/fixtures'

/**
 * ESC-30 — Administración del catálogo · API testing
 * GET /phones/id/:id · POST /phones · PUT /phones/:id · DELETE /phones/:id
 *
 * Contrato HTTP del CRUD del panel: 200 / 201 / 204 / 400 / 404 / 409, la
 * forma completa del celular y cada regla de validación del cuerpo,
 * parametrizada como en el ejemplo del curso. Al final, la misma prueba de
 * independencia que test_crear_producto_no_contamina_otras_pruebas.
 */

const RUTA = '/api/v1/phones'

// La entidad Phone completa, como la recibe el formulario de edición.
const CAMPOS_CELULAR = [
  'id', 'slug', 'name', 'brand', 'categoryId', 'price', 'compareAt', 'badge',
  'stock', 'minStock', 'condition', 'verified', 'batteryHealth', 'ram',
  'storage', 'camera', 'battery', 'screen', 'chip', 'shortDesc', 'longDesc',
  'heroImage', 'images', 'colors', 'features', 'createdAt', 'updatedAt',
]

describe('ESC-30 · API — administración del catálogo', () => {
  it('POST válido → 201 con el celular creado y todos sus campos', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const body = bodyCelularValido()
    prismaMock.phone.findUnique.mockResolvedValue(null)
    prismaMock.phone.create.mockResolvedValue(celular({ slug: body.slug, name: body.name }))

    // Act
    const res = await request(app).post(RUTA).set('Authorization', `Bearer ${token}`).send(body)

    // Assert
    expect(res.status).to.equal(201)
    expect(res.headers['content-type']).to.match(/^application\/json/)
    expect(res.body.data).to.have.all.keys(CAMPOS_CELULAR)
    expect(res.body.data).to.include({ slug: body.slug, name: body.name })
  })

  it('GET /phones/id/:id alimenta el formulario de edición con el registro completo', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const existente = celular({ minStock: 4 })
    prismaMock.phone.findUnique.mockResolvedValue(existente)

    // Act
    const res = await request(app)
      .get(`${RUTA}/id/${existente.id}`)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(200)
    expect(res.body.data).to.have.all.keys(CAMPOS_CELULAR)
    // El umbral de reposición solo lo ve el panel, no la ficha pública.
    expect(res.body.data.minStock).to.equal(4)
  })

  it.each([
    [{ price: 0 }, 'price', 'precio cero'],
    [{ price: -100 }, 'price', 'precio negativo'],
    [{ price: 1_500_000.5 }, 'price', 'precio con decimales'],
    [{ slug: 'ab' }, 'slug', 'slug de 2 caracteres'],
    [{ name: 'ab' }, 'name', 'nombre de 2 caracteres'],
    [{ brand: 'A' }, 'brand', 'marca de 1 carácter'],
    [{ categoryId: '' }, 'categoryId', 'categoría vacía'],
    [{ stock: -1 }, 'stock', 'stock negativo'],
    [{ condition: 'ROTO' }, 'condition', 'condición inexistente'],
    [{ batteryHealth: 101 }, 'batteryHealth', 'batería por encima de 100%'],
    [{ heroImage: 'no-es-una-url' }, 'heroImage', 'imagen sin URL válida'],
    [{ colors: [{ colorId: 'negro', name: 'Negro', hex: 'negro' }] }, 'colors.0.hex', 'color sin hex'],
  ])('POST con %j → 400 en el campo %s (%s)', async (cambio, campo, _caso) => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    const res = await request(app)
      .post(RUTA)
      .set('Authorization', `Bearer ${token}`)
      .send(bodyCelularValido(cambio))

    // Assert
    expect(res.status).to.equal(400)
    expect(res.body.error).to.equal('Datos inválidos')
    expect(res.body.errors.map((e: { field: string }) => e.field)).to.deep.equal([campo])
    expect(prismaMock.phone.create.mock.calls).to.be.empty
  })

  it('PUT parcial también valida lo que llega: precio negativo → 400', async () => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    const res = await request(app)
      .put(`${RUTA}/${ID_INEXISTENTE}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: -5 })

    // Assert
    expect(res.status).to.equal(400)
    expect(res.body.errors.map((e: { field: string }) => e.field)).to.deep.equal(['price'])
    expect(prismaMock.phone.update.mock.calls).to.be.empty
  })

  it('POST con un slug que ya existe → 409 con un único mensaje de error', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.phone.findUnique.mockResolvedValue(celular({ slug: 'iphone-15' }))

    // Act
    const res = await request(app)
      .post(RUTA)
      .set('Authorization', `Bearer ${token}`)
      .send(bodyCelularValido({ slug: 'iphone-15' }))

    // Assert
    expect(res.status).to.equal(409)
    expect(res.body).to.deep.equal({ error: 'Ya existe un celular con ese slug' })
  })

  it.each([
    ['PUT', 'put'],
    ['DELETE', 'delete'],
  ] as const)('%s sobre un id inexistente → 404 con un único mensaje de error', async (_metodo, verbo) => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.phone.findUnique.mockResolvedValue(null)

    // Act
    const res = await request(app)
      [verbo](`${RUTA}/${ID_INEXISTENTE}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 2_000_000 })

    // Assert
    expect(res.status).to.equal(404)
    expect(res.body).to.deep.equal({ error: 'Celular no encontrado' })
  })

  it('DELETE existente → 204 sin cuerpo', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const existente = celular()
    prismaMock.phone.findUnique.mockResolvedValue(existente)
    prismaMock.phone.delete.mockResolvedValue(existente)

    // Act
    const res = await request(app)
      .delete(`${RUTA}/${existente.id}`)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(204)
    expect(res.text).to.equal('')
  })

  it('JSON mal formado en POST → 400, no 500 (DEF-REG-01)', async () => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    const res = await request(app)
      .post(RUTA)
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send('{"slug": "iphone-15", "price": }')

    // Assert
    expect(res.status).to.equal(400)
    expect(res.body).to.deep.equal({ error: 'El cuerpo de la petición no es un JSON válido' })
    expect(prismaMock.phone.create.mock.calls).to.be.empty
  })

  describe('Independencia (FIRST)', () => {
    const SLUG_DE_LA_PRUEBA = 'celular-creado-en-la-prueba-anterior'

    it('crear un celular en esta prueba lo deja consultable aquí...', async () => {
      // Arrange
      const { token } = autenticarAdmin()
      const nuevo = celular({ slug: SLUG_DE_LA_PRUEBA })
      prismaMock.phone.findUnique
        .mockResolvedValueOnce(null) // el slug está libre: se puede crear
        .mockResolvedValue(nuevo) // de ahí en adelante el celular existe
      prismaMock.phone.create.mockResolvedValue(nuevo)

      // Act
      const creado = await request(app)
        .post(RUTA)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyCelularValido({ slug: SLUG_DE_LA_PRUEBA }))
      const consultado = await request(app).get(`${RUTA}/${SLUG_DE_LA_PRUEBA}`)

      // Assert
      expect(creado.status).to.equal(201)
      expect(consultado.status).to.equal(200)
    })

    it('...pero no contamina la siguiente: el mismo GET ahora responde 404', async () => {
      // Act
      const res = await request(app).get(`${RUTA}/${SLUG_DE_LA_PRUEBA}`)

      // Assert
      // Si lo que programó la prueba anterior sobreviviera, esto sería 200.
      expect(res.status).to.equal(404)
      expect(prismaMock.phone.create.mock.calls).to.be.empty
    })
  })
})
