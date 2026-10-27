import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { consultaDe, prismaMock } from '../helpers/prisma-mock'
import {
  ID_INEXISTENTE,
  autenticar,
  autenticarAdmin,
  autenticarAdminConDirectorio,
  errorRegistroNoEncontrado,
  tokenConFirmaInvalida,
  usuarioConConteo,
} from '../helpers/fixtures'

/**
 * ESC-26 — Banear usuario
 * PUT /api/v1/admin/users/:id/ban
 *
 * Una prueba por cada camino básico del grafo de flujo. V(G) = 8, así que
 * son 8 caminos (el 8 se agregó con la regla "no se banea a un administrador",
 * hallazgo H7.1 de la evaluación heurística). Solo se sustituye la capa de
 * datos: rutas, middlewares, controlador, caso de uso y repositorio se
 * ejecutan de verdad.
 */

const RUTA = (id: string) => `/api/v1/admin/users/${id}/ban`
const MOTIVO = { reason: 'fraude en pagos' }

describe('ESC-26 — Banear usuario', () => {
  it('Camino 1 (1-2-14): sin cabecera Bearer → 401 Token requerido', async () => {
    // Act
    const res = await request(app).put(RUTA(ID_INEXISTENTE)).send(MOTIVO)

    // Assert
    expect(res.status).to.equal(401)
    expect(res.body.error).to.equal('Token requerido')
    expect(prismaMock.user.update.mock.calls).to.be.empty
  })

  it('Camino 2 (1-3-4-14): firma inválida → 401 Token inválido o expirado', async () => {
    // Act
    const res = await request(app)
      .put(RUTA(ID_INEXISTENTE))
      .set('Authorization', `Bearer ${tokenConFirmaInvalida()}`)
      .send(MOTIVO)

    // Assert
    expect(res.status).to.equal(401)
    expect(res.body.error).to.equal('Token inválido o expirado')
    expect(prismaMock.user.update.mock.calls).to.be.empty
  })

  it('Camino 3 (1-3-5-6-14): rol USER → 403 Acceso restringido', async () => {
    // Arrange
    const { user, token } = autenticar()

    // Act
    const res = await request(app)
      .put(RUTA(user.id))
      .set('Authorization', `Bearer ${token}`)
      .send(MOTIVO)

    // Assert
    expect(res.status).to.equal(403)
    expect(res.body.error).to.equal('Acceso restringido a administradores')
    expect(prismaMock.user.update.mock.calls).to.be.empty
  })

  it('Camino 4 (1-3-5-7-8-14): reason con menos de 4 caracteres → 400 Datos inválidos', async () => {
    // Arrange
    const { user, token } = autenticarAdmin()

    // Act
    const res = await request(app)
      .put(RUTA(user.id))
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'ab' })

    // Assert
    expect(res.status).to.equal(400)
    expect(res.body.error).to.equal('Datos inválidos')
    expect(prismaMock.user.update.mock.calls).to.be.empty
  })

  it('Camino 5 (1-3-5-7-9-10-14): un admin no puede banearse a sí mismo (RN-05) → 400', async () => {
    // Arrange
    const { user, token } = autenticarAdmin()

    // Act
    const res = await request(app)
      .put(RUTA(user.id))
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'autobaneo de prueba' })

    // Assert
    // DEF-26-02 corregido: antes respondía 200 y el admin se dejaba fuera del panel.
    expect(res.status).to.equal(400)
    expect(res.body.error).to.equal('No puedes banear tu propia cuenta')
    // La regla de negocio corta antes de tocar la capa de datos.
    expect(prismaMock.user.update.mock.calls).to.be.empty
  })

  it('Camino 6 (1-3-5-7-9-11-12-14): el id no existe → 404 Usuario no encontrado', async () => {
    // Arrange
    // El middleware encuentra al admin; la comprobación posterior no encuentra el id.
    const { token } = autenticarAdminConDirectorio()
    prismaMock.user.update.mockRejectedValue(errorRegistroNoEncontrado())

    // Act
    const res = await request(app)
      .put(RUTA(ID_INEXISTENTE))
      .set('Authorization', `Bearer ${token}`)
      .send(MOTIVO)

    // Assert
    // DEF-26-01 corregido: antes el P2025 de Prisma salía como 500.
    expect(consultaDe(prismaMock.user.update)).to.deep.include({
      where: { id: ID_INEXISTENTE, role: 'USER' },
    })
    expect(res.status).to.equal(404)
    expect(res.body.error).to.equal('Usuario no encontrado')
  })

  it('Camino 7 (1-3-5-7-9-11-13-14): datos correctos → 200 con el usuario baneado', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const victima = usuarioConConteo({
      banned: true,
      banReason: MOTIVO.reason,
    })
    prismaMock.user.update.mockResolvedValue(victima)

    // Act
    const res = await request(app)
      .put(RUTA(victima.id))
      .set('Authorization', `Bearer ${token}`)
      .send(MOTIVO)

    // Assert
    const consulta = consultaDe(prismaMock.user.update)
    // role: 'USER' va en el mismo UPDATE: la regla es atómica.
    expect(consulta.where).to.deep.equal({ id: victima.id, role: 'USER' })
    expect(consulta.data)
      .to.include({ banned: true, banReason: MOTIVO.reason })
      .and.have.property('bannedAt').that.is.instanceOf(Date)
    expect(res.status).to.equal(200)
    // La contraseña nunca debe viajar en la respuesta.
    expect(res.body.data, 'usuario baneado')
      .to.include({ id: victima.id, banned: true, banReason: MOTIVO.reason })
      .and.not.have.property('password')
    expect(res.body.data.bannedAt, 'fecha del baneo').to.not.be.null
  })

  it('Camino 8: el destino es otro administrador → 403 y no se banea (H7.1)', async () => {
    // Arrange
    const otroAdmin = usuarioConConteo({ id: 'admin-2', role: 'ADMIN', email: 'otro.admin@celularpro.co' })
    const { token } = autenticarAdminConDirectorio([otroAdmin])
    // El UPDATE condicionado a role USER no encuentra fila...
    prismaMock.user.update.mockRejectedValue(errorRegistroNoEncontrado())
    // ...y la comprobación descubre que el id existe y es ADMIN.

    // Act
    const res = await request(app)
      .put(RUTA(otroAdmin.id))
      .set('Authorization', `Bearer ${token}`)
      .send(MOTIVO)

    // Assert
    expect(res.status).to.equal(403)
    expect(res.body.error).to.equal(
      'No puedes banear a un administrador. Quítale primero el rol de administrador.',
    )
    expect(consultaDe(prismaMock.user.update)).to.deep.include({
      where: { id: otroAdmin.id, role: 'USER' },
    })
    expect(prismaMock.user.update.mock.calls).to.have.lengthOf(1)
  })
})
