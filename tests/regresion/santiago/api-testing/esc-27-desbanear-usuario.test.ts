import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../../../src/app'
import { prismaMock } from '../../../helpers/prisma-mock'

// Lo único que el desbaneo debe escribir en la fila, venga lo que venga.
const DATOS_DEL_DESBANEO = { banned: false, banReason: null, bannedAt: null }
import {
  ID_INEXISTENTE,
  autenticarAdmin,
  errorRegistroNoEncontrado,
  usuarioConConteo,
} from '../../../helpers/fixtures'

/**
 * ESC-27 — Desbanear usuario · API testing
 * PUT /api/v1/admin/users/:id/unban   (sin cuerpo)
 *
 * Contrato HTTP: forma exacta de la respuesta, que no necesite cuerpo, que
 * sea idempotente (PUT dos veces da lo mismo) y los códigos 200 / 404.
 */

const RUTA = (id: string) => `/api/v1/admin/users/${id}/unban`

const CAMPOS_USUARIO_ADMIN = [
  'id', 'email', 'name', 'role', 'banned', 'banReason', 'bannedAt',
  'createdAt', 'updatedAt', 'orderCount',
]

describe('ESC-27 · API — desbanear usuario', () => {
  it('200: devuelve el usuario reactivado con el contrato completo del panel', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const ana = usuarioConConteo({ orders: 1 })
    prismaMock.user.update.mockResolvedValue(ana)

    // Act
    const res = await request(app)
      .put(RUTA(ana.id))
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(200)
    expect(res.headers['content-type']).to.match(/^application\/json/)
    expect(res.body).to.have.all.keys('data')
    expect(res.body.data).to.have.all.keys(CAMPOS_USUARIO_ADMIN)
    expect(res.body.data).to.include({
      id: ana.id,
      banned: false,
      banReason: null,
      bannedAt: null,
      orderCount: 1,
    })
  })

  it('no necesita cuerpo: lo que llegue en el body no cambia la respuesta', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const ana = usuarioConConteo()
    prismaMock.user.update.mockResolvedValue(ana)

    // Act
    const sinCuerpo = await request(app)
      .put(RUTA(ana.id))
      .set('Authorization', `Bearer ${token}`)
    const conCuerpo = await request(app)
      .put(RUTA(ana.id))
      .set('Authorization', `Bearer ${token}`)
      .send({ cualquierCosa: true })

    // Assert
    expect(sinCuerpo.status).to.equal(200)
    expect(conCuerpo.status).to.equal(200)
    expect(conCuerpo.body).to.deep.equal(sinCuerpo.body)
    // Lo que se escribe en la base es lo mismo en los dos casos: el campo
    // extra del cuerpo no se cuela en el update.
    const [primeraEscritura, segundaEscritura] = prismaMock.user.update.mock.calls
    expect(primeraEscritura[0].data).to.deep.equal(DATOS_DEL_DESBANEO)
    expect(segundaEscritura[0].data).to.deep.equal(DATOS_DEL_DESBANEO)
  })

  it('es idempotente: desbanear a alguien que ya estaba activo también responde 200', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const activa = usuarioConConteo({ banned: false })
    prismaMock.user.update.mockResolvedValue(activa)

    // Act
    const primera = await request(app).put(RUTA(activa.id)).set('Authorization', `Bearer ${token}`)
    const segunda = await request(app).put(RUTA(activa.id)).set('Authorization', `Bearer ${token}`)

    // Assert
    expect(primera.status).to.equal(200)
    expect(segunda.status).to.equal(200)
    expect(segunda.body).to.deep.equal(primera.body)
    // Las dos veces se escribe exactamente lo mismo.
    expect(prismaMock.user.update.mock.calls.map(([consulta]) => consulta.data)).to.deep.equal([
      DATOS_DEL_DESBANEO,
      DATOS_DEL_DESBANEO,
    ])
  })

  it('id inexistente → 404 con un único mensaje de error', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockRejectedValue(errorRegistroNoEncontrado())

    // Act
    const res = await request(app)
      .put(RUTA(ID_INEXISTENTE))
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(404)
    expect(res.body).to.deep.equal({ error: 'Usuario no encontrado' })
  })

  it('el desbaneo solo existe como PUT: un POST sobre la misma ruta → 404', async () => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    const res = await request(app)
      .post(RUTA('user-2'))
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(404)
    expect(res.body).to.deep.equal({ error: 'Ruta no encontrada' })
    expect(prismaMock.user.update.mock.calls).to.be.empty
  })
})
