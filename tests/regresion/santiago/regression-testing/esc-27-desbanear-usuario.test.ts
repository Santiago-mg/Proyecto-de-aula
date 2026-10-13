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
  type FilaUsuario,
} from '../../../helpers/fixtures'

/**
 * ESC-27 — Desbanear usuario · regression-testing
 * PUT /api/v1/admin/users/:id/unban
 *
 * Incluye el ciclo completo con ESC-26 (activo → baneado → reactivado) sobre
 * una "base" en memoria de dos filas, para comprobar que el desbaneo devuelve
 * de verdad el acceso y no solo cambia un campo.
 */

const RUTA = (id: string) => `/api/v1/admin/users/${id}/unban`

describe('ESC-27 · Regresión — desbanear usuario', () => {
  it('desbanear limpia los tres campos del baneo en una sola escritura', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockResolvedValue(usuarioConConteo())

    // Act
    await request(app).put(RUTA('user-ana')).set('Authorization', `Bearer ${token}`)

    // Assert
    expect(consultaDe(prismaMock.user.update)).to.deep.include({
      where: { id: 'user-ana' },
      data: { banned: false, banReason: null, bannedAt: null },
    })
  })

  it('ciclo completo: activa → baneada (sin acceso) → desbaneada (con acceso)', async () => {
    // Arrange
    const admin = usuario({ role: 'ADMIN' })
    let ana: FilaUsuario = usuario({ name: 'Ana Torres' })
    // Base en memoria: findUnique lee la fila vigente y update la reemplaza.
    prismaMock.user.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
      where.id === admin.id ? admin : ana,
    )
    prismaMock.user.update.mockImplementation(async ({ data }: { data: Partial<FilaUsuario> }) => {
      ana = { ...ana, ...data }
      return { ...ana, _count: { orders: 0 } }
    })
    const comoAdmin = `Bearer ${generarToken(admin)}`
    const comoAna = `Bearer ${generarToken(ana)}`
    const anaEntra = () => request(app).get('/api/v1/auth/me').set('Authorization', comoAna)

    // Act
    const alPrincipio = await anaEntra()
    await request(app).put(`/api/v1/admin/users/${ana.id}/ban`).set('Authorization', comoAdmin).send({ reason: 'fraude en pagos' })
    const baneada = await anaEntra()
    await request(app).put(RUTA(ana.id)).set('Authorization', comoAdmin)
    const reactivada = await anaEntra()

    // Assert
    expect(alPrincipio.status).to.equal(200)
    expect(baneada.status).to.equal(403)
    expect(baneada.body.error).to.include('fraude en pagos')
    expect(reactivada.status).to.equal(200)
    expect(reactivada.body.data).to.include({ name: 'Ana Torres', banned: false, banReason: null })
  })

  describe('Defectos corregidos: no deben volver', () => {
    it('DEF-27-01 — desbanear un id inexistente respondía 500 (P2025 crudo); ahora 404', async () => {
      // Arrange
      const { token } = autenticarAdmin()
      prismaMock.user.update.mockRejectedValue(errorRegistroNoEncontrado())

      // Act
      const res = await request(app).put(RUTA(ID_INEXISTENTE)).set('Authorization', `Bearer ${token}`)

      // Assert
      expect(res.status).to.equal(404)
      expect(res.body).to.deep.equal({ error: 'Usuario no encontrado' })
    })
  })
})
