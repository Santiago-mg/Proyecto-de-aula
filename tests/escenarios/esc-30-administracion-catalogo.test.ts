import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { prismaMock } from '../helpers/prisma-mock'
import {
  ID_INEXISTENTE,
  autenticar,
  autenticarAdmin,
  bodyCelularValido,
  celular,
  tokenConFirmaInvalida,
} from '../helpers/fixtures'

/**
 * ESC-30 — Administración del catálogo
 * POST / PUT / DELETE /api/v1/phones
 *
 * V(G) = 10. El nodo 7 del grafo bifurca según el método HTTP, por eso los
 * caminos 4 a 10 se agrupan en POST, PUT y DELETE.
 */

const RUTA = '/api/v1/phones'

describe('ESC-30 — Administración del catálogo', () => {
  it('Camino 1 (1-2-19): sin cabecera Bearer → 401 Token requerido', async () => {
    // Act
    const res = await request(app).post(RUTA).send(bodyCelularValido())

    // Assert
    expect(res.status).to.equal(401)
    expect(res.body.error).to.equal('Token requerido')
    expect(prismaMock.phone.create.mock.calls).to.be.empty
  })

  it('Camino 2 (1-3-4-19): firma inválida → 401 Token inválido o expirado', async () => {
    // Act
    const res = await request(app)
      .post(RUTA)
      .set('Authorization', `Bearer ${tokenConFirmaInvalida()}`)
      .send(bodyCelularValido())

    // Assert
    expect(res.status).to.equal(401)
    expect(res.body.error).to.equal('Token inválido o expirado')
    expect(prismaMock.phone.create.mock.calls).to.be.empty
  })

  it('Camino 3 (1-3-5-6-19): rol USER → 403 Acceso restringido', async () => {
    // Arrange
    const { token } = autenticar()

    // Act
    const res = await request(app)
      .post(RUTA)
      .set('Authorization', `Bearer ${token}`)
      .send(bodyCelularValido())

    // Assert
    expect(res.status).to.equal(403)
    expect(res.body.error).to.equal('Acceso restringido a administradores')
    expect(prismaMock.phone.create.mock.calls).to.be.empty
  })

  it('Camino 4 (1-3-5-7-8-9-19): POST con body inválido → 400 Datos inválidos', async () => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    // Falta `condition` y el precio es negativo.
    const res = await request(app)
      .post(RUTA)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...bodyCelularValido({ price: -100 }), condition: undefined })

    // Assert
    expect(res.status).to.equal(400)
    expect(res.body.error).to.equal('Datos inválidos')
    expect(prismaMock.phone.create.mock.calls).to.be.empty
  })

  it('Camino 5 (1-3-5-7-8-10-11-19): POST con un slug repetido (RN-01) → 409 Ya existe un celular con ese slug', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const existente = celular({ slug: 'iphone-15-prueba' })
    prismaMock.phone.findUnique.mockResolvedValue(existente)

    // Act
    const res = await request(app)
      .post(RUTA)
      .set('Authorization', `Bearer ${token}`)
      .send(bodyCelularValido({ slug: existente.slug }))

    // Assert
    // DEF-30-01 corregido: antes salía 500 con el error crudo de Prisma y
    // la respuesta filtraba la ruta interna del archivo del repositorio.
    expect(res.status).to.equal(409)
    expect(res.body.error).to.equal('Ya existe un celular con ese slug')
    expect(res.body).to.not.have.property('detail')
    expect(prismaMock.phone.create.mock.calls).to.be.empty
  })

  it('Camino 6 (1-3-5-7-8-10-12-19): POST con body válido y slug libre → 201 celular creado', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const body = bodyCelularValido()
    // El slug está libre: la búsqueda previa no encuentra nada.
    prismaMock.phone.findUnique.mockResolvedValue(null)
    prismaMock.phone.create.mockResolvedValue(
      celular({ slug: body.slug, name: body.name }),
    )

    // Act
    const res = await request(app)
      .post(RUTA)
      .set('Authorization', `Bearer ${token}`)
      .send(body)

    // Assert
    expect(res.status).to.equal(201)
    expect(res.body.data).to.deep.include({ slug: body.slug, name: body.name })
  })

  it('Camino 7 (1-3-5-7-13-14-19): PUT sobre un id que no existe → 404 Celular no encontrado', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.phone.findUnique.mockResolvedValue(null)

    // Act
    const res = await request(app)
      .put(`${RUTA}/${ID_INEXISTENTE}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 2_000_000 })

    // Assert
    expect(res.status).to.equal(404)
    expect(res.body.error).to.equal('Celular no encontrado')
    expect(prismaMock.phone.update.mock.calls).to.be.empty
  })

  it('Camino 8 (1-3-5-7-13-15-19): PUT sobre un celular existente → 200 actualizado', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const existente = celular()
    prismaMock.phone.findUnique.mockResolvedValue(existente)
    prismaMock.phone.update.mockResolvedValue({
      ...existente,
      price: 2_000_000,
    })

    // Act
    const res = await request(app)
      .put(`${RUTA}/${existente.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 2_000_000 })

    // Assert
    expect(res.status).to.equal(200)
    expect(res.body.data.price).to.equal(2_000_000)
  })

  it('Camino 9 (1-3-5-7-16-17-19): DELETE sobre un id que no existe → 404 Celular no encontrado', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.phone.findUnique.mockResolvedValue(null)

    // Act
    const res = await request(app)
      .delete(`${RUTA}/${ID_INEXISTENTE}`)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(404)
    expect(res.body.error).to.equal('Celular no encontrado')
    expect(prismaMock.phone.delete.mock.calls).to.be.empty
  })

  it('Camino 10 (1-3-5-7-16-18-19): DELETE sobre un celular existente → 204 sin contenido', async () => {
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
    expect(prismaMock.phone.delete.mock.calls).to.deep.include([{
      where: { id: existente.id },
    }])
    expect(res.status).to.equal(204)
    expect(res.body).to.deep.equal({})
  })
})
