import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../../../src/app'
import { consultaDe, prismaMock } from '../../../helpers/prisma-mock'
import {
  ID_INEXISTENTE,
  autenticarAdmin,
  errorRegistroNoEncontrado,
  generarToken,
  usuario,
  usuarioConConteo,
} from '../../../helpers/fixtures'

/**
 * ESC-26 — Banear usuario · regression-testing
 * PUT /api/v1/admin/users/:id/ban
 *
 * Comportamiento ya aceptado del baneo (AAA y FIRST) y, al final, el catálogo
 * de defectos que ya se corrigieron: cada uno tiene una prueba con su código
 * para que, si vuelve, se sepa de inmediato cuál es.
 */

const RUTA = (id: string) => `/api/v1/admin/users/${id}/ban`

describe('ESC-26 · Regresión — banear usuario', () => {
  it('banear escribe los tres campos juntos: banned, banReason y bannedAt', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockResolvedValue(usuarioConConteo({ banned: true, banReason: 'fraude en pagos' }))
    const antes = new Date()

    // Act
    await request(app).put(RUTA('user-ana')).set('Authorization', `Bearer ${token}`).send({ reason: 'fraude en pagos' })

    // Assert
    const { data } = consultaDe(prismaMock.user.update) as { data: { banned: boolean; banReason: string; bannedAt: Date } }
    expect(data.banned).to.equal(true)
    expect(data.banReason).to.equal('fraude en pagos')
    expect(data.bannedAt).to.be.instanceOf(Date)
    expect(data.bannedAt.getTime()).to.be.at.least(antes.getTime())
  })

  it.each([
    ['abcd', 200, 'exactamente 4 caracteres'],
    ['abc', 400, '3 caracteres'],
    ['  abcd  ', 200, '4 caracteres rodeados de espacios'],
    ['  ab  ', 400, '2 caracteres rodeados de espacios'],
  ])('motivo %j → %i (%s)', async (motivo, estado) => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockResolvedValue(usuarioConConteo({ banned: true }))

    // Act
    const res = await request(app).put(RUTA('user-ana')).set('Authorization', `Bearer ${token}`).send({ reason: motivo })

    // Assert
    expect(res.status).to.equal(estado)
  })

  it('el motivo se guarda recortado, sin los espacios de los lados', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockResolvedValue(usuarioConConteo({ banned: true }))

    // Act
    await request(app).put(RUTA('user-ana')).set('Authorization', `Bearer ${token}`).send({ reason: '   fraude en pagos   ' })

    // Assert
    expect(consultaDe(prismaMock.user.update).data).to.include({ banReason: 'fraude en pagos' })
  })

  it('el usuario suspendido ve el motivo cuando intenta usar su sesión', async () => {
    // Arrange
    const ana = usuario({ banned: true, banReason: 'fraude en pagos' })
    prismaMock.user.findUnique.mockResolvedValue(ana)

    // Act
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${generarToken(ana)}`)

    // Assert
    expect(res.status).to.equal(403)
    expect(res.body.error).to.equal('Tu cuenta ha sido suspendida. Motivo: fraude en pagos')
  })

  it('si la fila no tiene motivo, el mensaje de suspensión no inventa uno', async () => {
    // Arrange
    const ana = usuario({ banned: true, banReason: null })
    prismaMock.user.findUnique.mockResolvedValue(ana)

    // Act
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${generarToken(ana)}`)

    // Assert
    expect(res.body.error).to.equal('Tu cuenta ha sido suspendida.')
  })

  describe('Defectos corregidos: no deben volver', () => {
    it('DEF-26-01 — banear un id inexistente respondía 500 (P2025 crudo); ahora 404', async () => {
      // Arrange
      const { token } = autenticarAdmin()
      prismaMock.user.update.mockRejectedValue(errorRegistroNoEncontrado())

      // Act
      const res = await request(app).put(RUTA(ID_INEXISTENTE)).set('Authorization', `Bearer ${token}`).send({ reason: 'fraude en pagos' })

      // Assert
      expect(res.status).to.equal(404)
      expect(res.body).to.deep.equal({ error: 'Usuario no encontrado' })
    })

    it('DEF-26-02 — un admin podía banearse a sí mismo y quedaba fuera del panel; ahora 400', async () => {
      // Arrange
      const { user, token } = autenticarAdmin()

      // Act
      const res = await request(app).put(RUTA(user.id)).set('Authorization', `Bearer ${token}`).send({ reason: 'autobaneo' })

      // Assert
      expect(res.status).to.equal(400)
      expect(prismaMock.user.update.mock.calls).to.be.empty
    })

    it('DEF-REG-03 — un motivo de solo espacios pasaba la validación; ahora 400', async () => {
      // Arrange
      const { token } = autenticarAdmin()

      // Act
      const res = await request(app).put(RUTA('user-ana')).set('Authorization', `Bearer ${token}`).send({ reason: '        ' })

      // Assert
      expect(res.status).to.equal(400)
      expect(res.body.errors).to.deep.equal([
        { field: 'reason', message: 'El motivo debe tener al menos 4 caracteres' },
      ])
    })
  })
})
