import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../../../src/app'
import { consultaDe, prismaMock } from '../../../helpers/prisma-mock'
import {
  autenticarAdmin,
  usuarioConConteo,
} from '../../../helpers/fixtures'
import {
  CREDENCIALES_INVALIDAS,
  SESIONES_SIN_PERMISO,
  enviar,
  existeElAdminDeLosTokens,
  type Endpoint,
} from '../helpers/acceso'

/**
 * ESC-27 — Desbanear usuario · security-testing
 * PUT /api/v1/admin/users/:id/unban
 *
 * Lo crítico aquí es que nadie pueda reactivarse a sí mismo: ni un usuario
 * común, ni un administrador al que suspendieron.
 */

const RUTA = (id: string) => `/api/v1/admin/users/${id}/unban`
const DESBANEAR_A_ANA: Endpoint = { metodo: 'put', ruta: RUTA('user-ana') }

describe('ESC-27 · Seguridad — desbanear usuario', () => {
  describe('Autenticación', () => {
    it.each(CREDENCIALES_INVALIDAS)('%s → 401 y nadie queda reactivado', async (_caso, cabecera) => {
      // Arrange
      existeElAdminDeLosTokens()

      // Act
      const res = await enviar(DESBANEAR_A_ANA, cabecera)

      // Assert
      expect(res.status).to.equal(401)
      expect(prismaMock.user.update.mock.calls).to.be.empty
    })
  })

  describe('Autorización', () => {
    it.each(SESIONES_SIN_PERMISO)('%s → 403 y nadie queda reactivado', async (_caso, sesion, mensaje) => {
      // Arrange
      const cabecera = sesion()

      // Act
      const res = await enviar(DESBANEAR_A_ANA, cabecera)

      // Assert
      expect(res.status).to.equal(403)
      expect(res.body.error).to.match(mensaje)
      expect(prismaMock.user.update.mock.calls).to.be.empty
    })
  })

  it('un administrador suspendido no puede desbanearse a sí mismo', async () => {
    // Arrange
    const { user, token } = autenticarAdmin({ banned: true, banReason: 'cuenta comprometida' })

    // Act
    const res = await request(app)
      .put(RUTA(user.id))
      .set('Authorization', `Bearer ${token}`)

    // Assert
    // auth.middleware lo frena antes de llegar a la ruta: su cuenta ya no
    // autentica, así que tampoco puede usar los permisos que tenía.
    expect(res.status).to.equal(403)
    expect(prismaMock.user.update.mock.calls).to.be.empty
  })

  it('asignación masiva: el desbaneo solo limpia los tres campos, aunque el body pida más', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockResolvedValue(usuarioConConteo())

    // Act
    await request(app)
      .put(RUTA('user-ana'))
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'ADMIN', email: 'atacante@correo.com' })

    // Assert
    expect(consultaDe(prismaMock.user.update).data).to.deep.equal({
      banned: false,
      banReason: null,
      bannedAt: null,
    })
  })

  it('ni la contraseña ni su hash viajan en la respuesta', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockResolvedValue(usuarioConConteo({ password: 'clave-de-ana' }))

    // Act
    const res = await request(app)
      .put(RUTA('user-ana'))
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.body.data).to.not.have.property('password')
    expect(JSON.stringify(res.body)).to.not.include('clave-de-ana')
  })
})
