import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../../../src/app'
import { prismaMock } from '../../../helpers/prisma-mock'
import { autenticarAdmin, bodyCelularValido, celular } from '../../../helpers/fixtures'
import { baseConLatencia, mediana, medir, repetir } from '../helpers/medicion'

/**
 * ESC-30 — Administración del catálogo · performance-testing
 * POST / PUT / DELETE /api/v1/phones
 *
 * Cada operación tiene un número fijo de consultas (verificar el slug o el
 * id, escribir y sincronizar la alerta de inventario). Se congela ese número
 * para que no aparezcan consultas de más, y se mide un celular grande para
 * que la validación y el mapeo no se vuelvan lentos.
 */

const PRESUPUESTO_MS = 500
const LATENCIA_BASE_MS = 30
const RUTA = '/api/v1/phones'

/** Un celular con muchas relaciones, para estresar validación y mapeo. */
function celularGrande() {
  return bodyCelularValido({
    features: Array.from({ length: 200 }, (_, i) => `Característica ${i + 1}`),
    images: Array.from({ length: 20 }, (_, i) => ({ url: `https://cdn.celularpro.co/img-${i}.jpg`, position: i })),
    colors: Array.from({ length: 10 }, (_, i) => ({ colorId: `color-${i}`, name: `Color ${i}`, hex: '#1a2b3c' })),
  })
}

describe('ESC-30 · Performance — administración del catálogo', () => {
  it('crear un celular produce el resultado correcto', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const body = bodyCelularValido()
    prismaMock.phone.findUnique.mockResolvedValue(null)
    prismaMock.phone.create.mockResolvedValue(celular({ slug: body.slug }))

    // Act
    const res = await request(app).post(RUTA).set('Authorization', `Bearer ${token}`).send(body)

    // Assert
    expect(res.status).to.equal(201)
    expect(res.body.data.slug).to.equal(body.slug)
  })

  it('un cuerpo inválido se rechaza sin consultar el slug ni escribir', async () => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    const res = await request(app).post(RUTA).set('Authorization', `Bearer ${token}`).send(bodyCelularValido({ price: -1 }))

    // Assert
    expect(res.status).to.equal(400)
    expect(prismaMock.phone.findUnique.mock.calls).to.be.empty
    expect(prismaMock.phone.create.mock.calls).to.be.empty
  })

  it('crear un celular con 200 características, 20 fotos y 10 colores cumple el presupuesto', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const body = celularGrande()
    prismaMock.phone.findUnique.mockResolvedValue(null)
    prismaMock.phone.create.mockResolvedValue(celular({ slug: body.slug }))
    const crear = () => request(app).post(RUTA).set('Authorization', `Bearer ${token}`).send(body)
    await crear() // calentamiento

    // Act
    const { resultado: res, ms } = await medir(crear)

    // Assert
    expect(res.status).to.equal(201)
    expect(ms, `La petición tardó ${ms.toFixed(3)} ms`).to.be.below(PRESUPUESTO_MS)
  })

  it('crear: 1 lectura del slug + 1 escritura + 1 sincronización de alertas', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.phone.findUnique.mockResolvedValue(null)
    prismaMock.phone.create.mockResolvedValue(celular({ stock: 10, minStock: 2 }))

    // Act
    await request(app).post(RUTA).set('Authorization', `Bearer ${token}`).send(bodyCelularValido())

    // Assert
    expect(prismaMock.phone.findUnique.mock.calls).to.have.lengthOf(1)
    expect(prismaMock.phone.create.mock.calls).to.have.lengthOf(1)
    expect(prismaMock.alert.updateMany.mock.calls).to.have.lengthOf(1)
    // Con stock sano no hay alerta que abrir.
    expect(prismaMock.alert.upsert.mock.calls).to.be.empty
  })

  it('editar: 1 lectura + 1 escritura + 1 sincronización de alertas', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const existente = celular({ stock: 10, minStock: 2 })
    prismaMock.phone.findUnique.mockResolvedValue(existente)
    prismaMock.phone.update.mockResolvedValue(existente)

    // Act
    await request(app).put(`${RUTA}/${existente.id}`).set('Authorization', `Bearer ${token}`).send({ price: 2_000_000 })

    // Assert
    expect(prismaMock.phone.findUnique.mock.calls).to.have.lengthOf(1)
    expect(prismaMock.phone.update.mock.calls).to.have.lengthOf(1)
    expect(prismaMock.alert.updateMany.mock.calls).to.have.lengthOf(1)
  })

  it('eliminar: 1 lectura + 1 borrado, sin tocar las alertas (las borra la cascada)', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const existente = celular()
    prismaMock.phone.findUnique.mockResolvedValue(existente)
    prismaMock.phone.delete.mockResolvedValue(existente)

    // Act
    await request(app).delete(`${RUTA}/${existente.id}`).set('Authorization', `Bearer ${token}`)

    // Assert
    expect(prismaMock.phone.findUnique.mock.calls).to.have.lengthOf(1)
    expect(prismaMock.phone.delete.mock.calls).to.have.lengthOf(1)
    expect(prismaMock.alert.updateMany.mock.calls).to.be.empty
  })

  it('validar antes de escribir es más rápido que crear (mediana de 5)', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const base = baseConLatencia(LATENCIA_BASE_MS)
    prismaMock.phone.findUnique.mockImplementation(base.responder(null))
    prismaMock.phone.create.mockImplementation(base.responder(celular()))
    const crear = (body: object) => () => request(app).post(RUTA).set('Authorization', `Bearer ${token}`).send(body)

    // Act
    const tiemposInvalido = await repetir(crear(bodyCelularValido({ price: 0 })), 5)
    const tiemposValido = await repetir(crear(bodyCelularValido()), 5)

    // Assert
    expect(mediana(tiemposInvalido)).to.be.below(mediana(tiemposValido))
  })
})
