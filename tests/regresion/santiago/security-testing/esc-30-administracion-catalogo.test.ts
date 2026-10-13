import { expect } from 'chai'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import request from 'supertest'
import app from '../../../../src/app'
import { consultaDe, prismaMock } from '../../../helpers/prisma-mock'
import {
  ID_INEXISTENTE,
  autenticarAdmin,
  bodyCelularValido,
  celular,
} from '../../../helpers/fixtures'
import {
  CREDENCIALES_INVALIDAS,
  SESIONES_SIN_PERMISO,
  enviar,
  existeElAdminDeLosTokens,
  type Endpoint,
} from '../helpers/acceso'

/**
 * ESC-30 — Administración del catálogo · security-testing
 * GET /phones/id/:id · POST /phones · PUT /phones/:id · DELETE /phones/:id
 *
 * Las cuatro operaciones del panel se prueban contra la misma matriz de
 * acceso. Además: asignación masiva, el tamaño máximo del cuerpo y que un
 * error de la base no filtre el esquema en producción.
 */

const RUTA = '/api/v1/phones'

const OPERACIONES: Array<[string, Endpoint, ReturnType<typeof vi.fn>]> = [
  ['GET /phones/id/:id (formulario de edición)', { metodo: 'get', ruta: `${RUTA}/id/${ID_INEXISTENTE}` }, prismaMock.phone.findUnique],
  ['POST /phones (crear)', { metodo: 'post', ruta: RUTA, body: bodyCelularValido() }, prismaMock.phone.create],
  ['PUT /phones/:id (editar)', { metodo: 'put', ruta: `${RUTA}/${ID_INEXISTENTE}`, body: { price: 1 } }, prismaMock.phone.update],
  ['DELETE /phones/:id (eliminar)', { metodo: 'delete', ruta: `${RUTA}/${ID_INEXISTENTE}` }, prismaMock.phone.delete],
]

describe('ESC-30 · Seguridad — administración del catálogo', () => {
  describe.each(OPERACIONES)('%s', (_operacion, endpoint, metodoDeLaBase) => {
    it.each(CREDENCIALES_INVALIDAS)('%s → 401 sin tocar el catálogo', async (_caso, cabecera) => {
      // Arrange
      existeElAdminDeLosTokens()

      // Act
      const res = await enviar(endpoint, cabecera)

      // Assert
      expect(res.status).to.equal(401)
      expect(metodoDeLaBase.mock.calls).to.be.empty
    })

    it.each(SESIONES_SIN_PERMISO)('%s → 403 sin tocar el catálogo', async (_caso, sesion, mensaje) => {
      // Arrange
      const cabecera = sesion()

      // Act
      const res = await enviar(endpoint, cabecera)

      // Assert
      expect(res.status).to.equal(403)
      expect(res.body.error).to.match(mensaje)
      // findUnique sí lo usa auth.middleware para leer la sesión; lo que no
      // puede pasar es que se lea, cree, edite o borre un celular.
      expect(prismaMock.phone.findUnique.mock.calls).to.be.empty
      expect(metodoDeLaBase.mock.calls).to.be.empty
    })
  })

  it('asignación masiva en POST: id, createdAt y campos desconocidos no llegan a la base', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.phone.findUnique.mockResolvedValue(null)
    prismaMock.phone.create.mockResolvedValue(celular())

    // Act
    await request(app)
      .post(RUTA)
      .set('Authorization', `Bearer ${token}`)
      .send(bodyCelularValido({ id: 'id-elegido-por-el-atacante', createdAt: '2000-01-01', esAdmin: true }))

    // Assert
    const { data } = consultaDe(prismaMock.phone.create) as { data: Record<string, unknown> }
    expect(data).to.not.have.any.keys('id', 'createdAt', 'updatedAt', 'esAdmin')
  })

  it('asignación masiva en PUT: el id de la URL manda, no el del cuerpo', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const existente = celular()
    prismaMock.phone.findUnique.mockResolvedValue(existente)
    prismaMock.phone.update.mockResolvedValue(existente)

    // Act
    await request(app)
      .put(`${RUTA}/${existente.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 2_000_000, id: 'otro-celular' })

    // Assert
    const consulta = consultaDe(prismaMock.phone.update) as { where: object; data: Record<string, unknown> }
    expect(consulta.where).to.deep.equal({ id: existente.id })
    expect(consulta.data).to.not.have.property('id')
  })

  it('un cuerpo de más de 100 kB → 413, no 500 (DEF-REG-02)', async () => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    const res = await request(app)
      .post(RUTA)
      .set('Authorization', `Bearer ${token}`)
      .send(bodyCelularValido({ longDesc: 'x'.repeat(150_000) }))

    // Assert
    // express.json() corta antes de leer el cuerpo entero: es una defensa
    // contra quien intenta agotar la memoria del servidor.
    expect(res.status).to.equal(413)
    expect(res.body).to.deep.equal({ error: 'El cuerpo de la petición es demasiado grande' })
    expect(prismaMock.phone.create.mock.calls).to.be.empty
  })

  describe('Fallo interno en producción', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      vi.unstubAllEnvs()
      vi.restoreAllMocks()
    })

    it('un error de la base al crear no filtra tablas ni restricciones', async () => {
      // Arrange
      const { token } = autenticarAdmin()
      prismaMock.phone.findUnique.mockResolvedValue(null)
      prismaMock.phone.create.mockRejectedValue(
        new Error('Foreign key constraint failed on the field: `Phone_categoryId_fkey (index)`'),
      )

      // Act
      const res = await request(app)
        .post(RUTA)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyCelularValido())

      // Assert
      expect(res.status).to.equal(500)
      expect(res.body).to.deep.equal({ error: 'Error interno del servidor' })
      expect(JSON.stringify(res.body)).to.not.include('Phone_categoryId_fkey')
    })
  })
})
