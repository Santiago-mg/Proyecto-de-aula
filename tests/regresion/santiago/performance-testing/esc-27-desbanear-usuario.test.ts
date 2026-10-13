import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../../../src/app'
import { prismaMock } from '../../../helpers/prisma-mock'
import {
  autenticar,
  autenticarAdmin,
  usuarioConConteo,
} from '../../../helpers/fixtures'
import { baseConLatencia, mediana, medir, repetir } from '../helpers/medicion'

/**
 * ESC-27 — Desbanear usuario · performance-testing
 * PUT /api/v1/admin/users/:id/unban
 *
 * Los tres campos del baneo se limpian en una sola escritura, sin una
 * lectura previa para "ver si estaba baneado". Y la autorización corta antes
 * de llegar a la base.
 */

const PRESUPUESTO_MS = 500
const LATENCIA_BASE_MS = 30
const RUTA = (id: string) => `/api/v1/admin/users/${id}/unban`

describe('ESC-27 · Performance — desbanear usuario', () => {
  it('el desbaneo produce el resultado correcto', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockResolvedValue(usuarioConConteo())

    // Act
    const res = await request(app).put(RUTA('user-ana')).set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(200)
    expect(res.body.data).to.include({ banned: false, banReason: null, bannedAt: null })
  })

  it('un usuario sin permiso se rechaza sin escribir en la base', async () => {
    // Arrange
    const { token } = autenticar()

    // Act
    const res = await request(app).put(RUTA('user-ana')).set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(403)
    expect(prismaMock.user.update.mock.calls).to.be.empty
  })

  it('desbanear cumple el presupuesto educativo', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockResolvedValue(usuarioConConteo())
    const desbanear = () => request(app).put(RUTA('user-ana')).set('Authorization', `Bearer ${token}`)
    await desbanear() // calentamiento

    // Act
    const { resultado: res, ms } = await medir(desbanear)

    // Assert
    expect(res.status).to.equal(200)
    expect(ms, `La petición tardó ${ms.toFixed(3)} ms`).to.be.below(PRESUPUESTO_MS)
  })

  it('una sola escritura, sin leer antes al usuario que se reactiva', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockResolvedValue(usuarioConConteo())

    // Act
    await request(app).put(RUTA('user-ana')).set('Authorization', `Bearer ${token}`)

    // Assert
    // La única lectura es la de la sesión del admin (auth.middleware).
    expect(prismaMock.user.findUnique.mock.calls).to.have.lengthOf(1)
    expect(prismaMock.user.update.mock.calls).to.have.lengthOf(1)
  })

  it('la autorización corta antes de la base: rechazar es más rápido que desbanear (mediana de 5)', async () => {
    // Arrange
    const base = baseConLatencia(LATENCIA_BASE_MS)
    const desbanearCon = (token: string) => () =>
      request(app).put(RUTA('user-ana')).set('Authorization', `Bearer ${token}`)

    // Act
    const { token: tokenDeUsuario } = autenticar()
    const tiemposRechazo = await repetir(desbanearCon(tokenDeUsuario), 5)

    const { token: tokenDeAdmin } = autenticarAdmin()
    prismaMock.user.update.mockImplementation(base.responder(usuarioConConteo()))
    const tiemposDesbaneo = await repetir(desbanearCon(tokenDeAdmin), 5)

    // Assert
    expect(mediana(tiemposRechazo)).to.be.below(mediana(tiemposDesbaneo))
    expect(base.consultas).to.equal(5)
  })
})
