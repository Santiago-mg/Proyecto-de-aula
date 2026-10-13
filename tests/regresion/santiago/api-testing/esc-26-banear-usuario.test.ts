import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../../../src/app'
import { prismaMock } from '../../../helpers/prisma-mock'
import {
  ID_INEXISTENTE,
  autenticarAdmin,
  errorRegistroNoEncontrado,
  usuarioConConteo,
} from '../../../helpers/fixtures'

/**
 * ESC-26 — Banear usuario · API testing
 * PUT /api/v1/admin/users/:id/ban   body: { reason }
 *
 * Contrato HTTP: forma exacta de la respuesta, valores límite del motivo,
 * cuerpos inválidos (parametrizados, como test_crear_producto_rechaza_datos_invalidos
 * del curso) y los códigos 200 / 400 / 404.
 */

const RUTA = (id: string) => `/api/v1/admin/users/${id}/ban`

// Campos del usuario tal como los ve el panel (AdminUser). Nunca `password`.
const CAMPOS_USUARIO_ADMIN = [
  'id', 'email', 'name', 'role', 'banned', 'banReason', 'bannedAt',
  'createdAt', 'updatedAt', 'orderCount',
]

describe('ESC-26 · API — banear usuario', () => {
  it('200: devuelve el usuario baneado con el contrato completo del panel', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const ana = usuarioConConteo({ banned: true, banReason: 'fraude en pagos', orders: 3 })
    prismaMock.user.update.mockResolvedValue(ana)

    // Act
    const res = await request(app)
      .put(RUTA(ana.id))
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'fraude en pagos' })

    // Assert
    expect(res.status).to.equal(200)
    expect(res.headers['content-type']).to.match(/^application\/json/)
    expect(res.body).to.have.all.keys('data')
    expect(res.body.data).to.have.all.keys(CAMPOS_USUARIO_ADMIN)
    expect(res.body.data).to.include({
      id: ana.id,
      role: 'USER',
      banned: true,
      banReason: 'fraude en pagos',
      orderCount: 3,
    })
    // Las fechas viajan como texto ISO 8601.
    expect(new Date(res.body.data.bannedAt).toISOString()).to.equal(res.body.data.bannedAt)
  })

  it('un motivo de exactamente 4 caracteres es el mínimo aceptado (valor límite)', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockResolvedValue(usuarioConConteo({ banned: true, banReason: 'spam' }))

    // Act
    const res = await request(app)
      .put(RUTA('user-2'))
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'spam' })

    // Assert
    expect(res.status).to.equal(200)
  })

  it.each([
    [{}, 'sin el campo reason'],
    [{ reason: '' }, 'motivo vacío'],
    [{ reason: 'abc' }, 'motivo de 3 caracteres'],
    [{ reason: 12345 }, 'motivo numérico'],
    [{ reason: null }, 'motivo nulo'],
  ])('%j (%s) → 400 con el error en el campo reason', async (body, _caso) => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    const res = await request(app)
      .put(RUTA('user-2'))
      .set('Authorization', `Bearer ${token}`)
      .send(body)

    // Assert
    expect(res.status).to.equal(400)
    expect(res.body.error).to.equal('Datos inválidos')
    expect(res.body.errors.map((e: { field: string }) => e.field)).to.deep.equal(['reason'])
    expect(prismaMock.user.update.mock.calls).to.be.empty
  })

  it('el mensaje de validación explica la regla del negocio', async () => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    const res = await request(app)
      .put(RUTA('user-2'))
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'abc' })

    // Assert
    expect(res.body.errors).to.deep.equal([
      { field: 'reason', message: 'El motivo debe tener al menos 4 caracteres' },
    ])
  })

  it('JSON mal formado → 400, no 500 (DEF-REG-01)', async () => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    const res = await request(app)
      .put(RUTA('user-2'))
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send('{"reason": "fraude en pagos"')

    // Assert
    // Es un error del cliente. Antes respondía 500 con el mensaje del parser.
    expect(res.status).to.equal(400)
    expect(res.body).to.deep.equal({ error: 'El cuerpo de la petición no es un JSON válido' })
    expect(prismaMock.user.update.mock.calls).to.be.empty
  })

  it('id inexistente → 404 con un único mensaje de error', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockRejectedValue(errorRegistroNoEncontrado())

    // Act
    const res = await request(app)
      .put(RUTA(ID_INEXISTENTE))
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'fraude en pagos' })

    // Assert
    expect(res.status).to.equal(404)
    expect(res.body).to.deep.equal({ error: 'Usuario no encontrado' })
  })

  it('el baneo solo existe como PUT: un GET sobre la misma ruta → 404', async () => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    const res = await request(app)
      .get(RUTA('user-2'))
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(404)
    expect(res.body).to.deep.equal({ error: 'Ruta no encontrada' })
    expect(prismaMock.user.update.mock.calls).to.be.empty
  })
})
