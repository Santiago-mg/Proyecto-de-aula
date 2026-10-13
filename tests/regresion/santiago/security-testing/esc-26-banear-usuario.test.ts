import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../../../src/app'
import { consultaDe, prismaMock } from '../../../helpers/prisma-mock'
import {
  autenticarAdmin,
  errorRegistroNoEncontrado,
  generarToken,
  usuario,
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
 * ESC-26 — Banear usuario · security-testing
 * PUT /api/v1/admin/users/:id/ban
 *
 * Autenticación, autorización, la regla de no banearse a uno mismo, la
 * asignación masiva de campos, que el baneo surta efecto sobre un token que
 * ya estaba emitido y que la contraseña no salga nunca.
 */

const RUTA = (id: string) => `/api/v1/admin/users/${id}/ban`
const BANEAR_A_ANA: Endpoint = { metodo: 'put', ruta: RUTA('user-ana'), body: { reason: 'fraude en pagos' } }

describe('ESC-26 · Seguridad — banear usuario', () => {
  describe('Autenticación', () => {
    it.each(CREDENCIALES_INVALIDAS)('%s → 401 y nadie queda baneado', async (_caso, cabecera) => {
      // Arrange
      existeElAdminDeLosTokens()

      // Act
      const res = await enviar(BANEAR_A_ANA, cabecera)

      // Assert
      expect(res.status).to.equal(401)
      expect(prismaMock.user.update.mock.calls).to.be.empty
    })
  })

  describe('Autorización', () => {
    it.each(SESIONES_SIN_PERMISO)('%s → 403 y nadie queda baneado', async (_caso, sesion, mensaje) => {
      // Arrange
      const cabecera = sesion()

      // Act
      const res = await enviar(BANEAR_A_ANA, cabecera)

      // Assert
      expect(res.status).to.equal(403)
      expect(res.body.error).to.match(mensaje)
      expect(prismaMock.user.update.mock.calls).to.be.empty
    })
  })

  it('un administrador no puede banearse a sí mismo (RN-05) y no se escribe nada', async () => {
    // Arrange
    const { user, token } = autenticarAdmin()

    // Act
    const res = await request(app)
      .put(RUTA(user.id))
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'autobaneo' })

    // Assert
    expect(res.status).to.equal(400)
    expect(res.body.error).to.equal('No puedes banear tu propia cuenta')
    expect(prismaMock.user.update.mock.calls).to.be.empty
  })

  it('asignación masiva: solo se escriben los tres campos del baneo, nunca role ni id', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockResolvedValue(usuarioConConteo({ banned: true }))

    // Act
    await request(app)
      .put(RUTA('user-ana'))
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'fraude en pagos', role: 'ADMIN', banned: false, id: 'otro', bannedAt: '2000-01-01' })

    // Assert
    const consulta = consultaDe(prismaMock.user.update)
    expect(consulta.where).to.deep.equal({ id: 'user-ana' })
    expect(consulta.data).to.have.all.keys('banned', 'banReason', 'bannedAt')
    expect(consulta.data).to.include({ banned: true, banReason: 'fraude en pagos' })
  })

  it('el servidor no confía en la validación del front: motivo de solo espacios → 400 (DEF-REG-03)', async () => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    // El modal del front recorta el motivo antes de habilitar el botón, pero
    // la API se puede llamar sin pasar por el front.
    const res = await request(app)
      .put(RUTA('user-ana'))
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: '      ' })

    // Assert
    expect(res.status).to.equal(400)
    expect(res.body.errors.map((e: { field: string }) => e.field)).to.deep.equal(['reason'])
    expect(prismaMock.user.update.mock.calls).to.be.empty
  })

  it('el baneo surte efecto de inmediato: el token que ya tenía el usuario deja de servir', async () => {
    // Arrange
    // Ana inició sesión antes de que la banearan: su JWT sigue sin vencer.
    const ana = usuario({ banned: true, banReason: 'fraude en pagos' })
    const tokenDeAna = generarToken(ana)
    prismaMock.user.findUnique.mockResolvedValue(ana)

    // Act
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokenDeAna}`)

    // Assert
    // auth.middleware relee la fila en cada petición en vez de confiar en el token.
    expect(res.status).to.equal(403)
    expect(res.body.error).to.equal('Tu cuenta ha sido suspendida. Motivo: fraude en pagos')
  })

  it('ni la contraseña ni su hash viajan en la respuesta', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockResolvedValue(
      usuarioConConteo({ banned: true, banReason: 'spam', password: 'clave-de-ana' }),
    )

    // Act
    const res = await request(app)
      .put(RUTA('user-ana'))
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'spam' })

    // Assert
    expect(res.body.data).to.not.have.property('password')
    expect(JSON.stringify(res.body)).to.not.include('clave-de-ana')
  })

  it('un motivo con HTML se guarda como texto y se responde como JSON, no como HTML', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const motivo = '<img src=x onerror="alert(1)">'
    prismaMock.user.update.mockResolvedValue(usuarioConConteo({ banned: true, banReason: motivo }))

    // Act
    const res = await request(app)
      .put(RUTA('user-ana'))
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: motivo })

    // Assert
    // Escapar es responsabilidad de quien lo muestra (el front, con React).
    // La API debe guardarlo tal cual lo escribió el admin (lo que se manda a
    // la base, no lo que el doble devuelve) y responder con un tipo que el
    // navegador no ejecute.
    expect(res.status).to.equal(200)
    expect(consultaDe(prismaMock.user.update).data).to.include({ banReason: motivo })
    expect(res.headers['content-type']).to.match(/^application\/json/)
    expect(res.body.data.banReason).to.equal(motivo)
  })

  it('un id con inyección llega a la base como dato literal → 404, no 500', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const id = "user' OR '1'='1"
    prismaMock.user.update.mockRejectedValue(errorRegistroNoEncontrado())

    // Act
    const res = await request(app)
      .put(RUTA(encodeURIComponent(id)))
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'fraude en pagos' })

    // Assert
    expect(consultaDe(prismaMock.user.update).where).to.deep.equal({ id })
    expect(res.status).to.equal(404)
  })
})
