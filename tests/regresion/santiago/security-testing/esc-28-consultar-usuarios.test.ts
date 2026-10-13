import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../../../src/app'
import { consultaDe, prismaMock } from '../../../helpers/prisma-mock'
import { autenticarAdmin, usuarioConConteo } from '../../../helpers/fixtures'
import {
  CREDENCIALES_INVALIDAS,
  SESIONES_SIN_PERMISO,
  enviar,
  existeElAdminDeLosTokens,
  type Endpoint,
} from '../helpers/acceso'

/**
 * ESC-28 — Consultar usuarios · security-testing
 * GET /api/v1/admin/users?page&limit&search
 *
 * El listado de usuarios es el endpoint con más datos personales del panel:
 * solo un administrador puede verlo, nunca muestra contraseñas, no se puede
 * volcar entero en una petición y el buscador no se puede usar para inyectar.
 */

const RUTA = '/api/v1/admin/users'
const LISTAR: Endpoint = { metodo: 'get', ruta: RUTA }

describe('ESC-28 · Seguridad — consultar usuarios', () => {
  describe('Autenticación', () => {
    it.each(CREDENCIALES_INVALIDAS)('%s → 401 sin consultar la tabla', async (_caso, cabecera) => {
      // Arrange
      existeElAdminDeLosTokens()

      // Act
      const res = await enviar(LISTAR, cabecera)

      // Assert
      expect(res.status).to.equal(401)
      expect(prismaMock.user.findMany.mock.calls).to.be.empty
    })
  })

  describe('Autorización', () => {
    it.each(SESIONES_SIN_PERMISO)('%s → 403 sin consultar la tabla', async (_caso, sesion, mensaje) => {
      // Arrange
      const cabecera = sesion()

      // Act
      const res = await enviar(LISTAR, cabecera)

      // Assert
      expect(res.status).to.equal(403)
      expect(res.body.error).to.match(mensaje)
      expect(prismaMock.user.findMany.mock.calls).to.be.empty
    })
  })

  it('ninguna fila del listado trae la contraseña, aunque la base la devuelva', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.count.mockResolvedValue(2)
    prismaMock.user.findMany.mockResolvedValue([
      usuarioConConteo({ password: 'clave-de-ana' }),
      usuarioConConteo({ password: 'clave-de-beto' }),
    ])

    // Act
    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    // Assert
    for (const fila of res.body.data) {
      expect(fila).to.not.have.property('password')
    }
    expect(JSON.stringify(res.body)).to.not.include('clave-de')
  })

  it('no se puede volcar la tabla completa en una petición: limit=1000 → 400', async () => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    const res = await request(app).get(`${RUTA}?limit=1000`).set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(400)
    expect(prismaMock.user.findMany.mock.calls).to.be.empty
  })

  it.each([
    ["' OR 1=1 --", 'inyección SQL'],
    ['%', 'comodín de LIKE'],
    ['<script>alert(1)</script>', 'script'],
    ['admin@celularpro.co\'; DROP TABLE "User"; --', 'consulta apilada'],
  ])('search=%j (%s) llega a la base como dato literal', async (termino) => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.count.mockResolvedValue(0)
    prismaMock.user.findMany.mockResolvedValue([])

    // Act
    const res = await request(app)
      .get(RUTA)
      .query({ search: termino })
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(200)
    expect(consultaDe(prismaMock.user.findMany).where).to.deep.equal({
      OR: [
        { name: { contains: termino, mode: 'insensitive' } },
        { email: { contains: termino, mode: 'insensitive' } },
      ],
    })
  })

  it('search como objeto (?search[$ne]=) no se cuela como operador: 400', async () => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    // Express convierte search[$ne]= en { $ne: '' }; el esquema exige texto.
    const res = await request(app)
      .get(`${RUTA}?search[$ne]=`)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(400)
    expect(prismaMock.user.findMany.mock.calls).to.be.empty
  })
})
