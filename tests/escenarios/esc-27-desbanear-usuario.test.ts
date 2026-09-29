import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { consultaDe, prismaMock } from '../helpers/prisma-mock'
import {
  ID_INEXISTENTE,
  autenticar,
  autenticarAdmin,
  errorRegistroNoEncontrado,
  tokenConFirmaInvalida,
  usuarioConConteo,
} from '../helpers/fixtures'

/**
 * ESC-27 — Desbanear usuario
 * PUT /api/v1/admin/users/:id/unban
 *
 * V(G) = 5, así que son 5 caminos básicos.
 */

const RUTA = (id: string) => `/api/v1/admin/users/${id}/unban`

describe('ESC-27 — Desbanear usuario', () => {
  it('Camino 1 (1-2-10): sin cabecera Bearer → 401 Token requerido', async () => {
    // Act
    const res = await request(app).put(RUTA(ID_INEXISTENTE))

    // Assert
    expect(res.status).to.equal(401)
    expect(res.body.error).to.equal('Token requerido')
    expect(prismaMock.user.update.mock.calls).to.be.empty
  })

  it('Camino 2 (1-3-4-10): firma inválida → 401 Token inválido o expirado', async () => {
    // Act
    const res = await request(app)
      .put(RUTA(ID_INEXISTENTE))
      .set('Authorization', `Bearer ${tokenConFirmaInvalida()}`)

    // Assert
    expect(res.status).to.equal(401)
    expect(res.body.error).to.equal('Token inválido o expirado')
    expect(prismaMock.user.update.mock.calls).to.be.empty
  })

  it('Camino 3 (1-3-5-6-10): rol USER → 403 Acceso restringido', async () => {
    // Arrange
    const { user, token } = autenticar()

    // Act
    const res = await request(app)
      .put(RUTA(user.id))
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(403)
    expect(res.body.error).to.equal('Acceso restringido a administradores')
    expect(prismaMock.user.update.mock.calls).to.be.empty
  })

  it('Camino 4 (1-3-5-7-8-10): el id no existe → 404 Usuario no encontrado', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockRejectedValue(errorRegistroNoEncontrado())

    // Act
    const res = await request(app)
      .put(RUTA(ID_INEXISTENTE))
      .set('Authorization', `Bearer ${token}`)

    // Assert
    // DEF-27-01 corregido: antes el P2025 de Prisma salía como 500.
    expect(res.status).to.equal(404)
    expect(res.body.error).to.equal('Usuario no encontrado')
  })

  it('Camino 5 (1-3-5-7-9-10): usuario suspendido → 200 y se limpian los tres campos del baneo', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const victima = usuarioConConteo()
    prismaMock.user.update.mockResolvedValue(victima)

    // Act
    const res = await request(app)
      .put(RUTA(victima.id))
      .set('Authorization', `Bearer ${token}`)

    // Assert
    // Los tres campos del baneo se limpian juntos en la misma escritura.
    expect(consultaDe(prismaMock.user.update)).to.deep.include({
      where: { id: victima.id },
      data: { banned: false, banReason: null, bannedAt: null },
    })
    expect(res.status).to.equal(200)
    expect(res.body.data).to.deep.include({
      id: victima.id,
      banned: false,
      banReason: null,
      bannedAt: null,
    })
  })
})
