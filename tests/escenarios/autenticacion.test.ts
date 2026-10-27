import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { prismaMock } from '../helpers/prisma-mock'
import {
  autenticar,
  tokenConFirmaInvalida,
  usuario,
} from '../helpers/fixtures'

/**
 * Endpoints de autenticación
 * POST /api/v1/auth/register · POST /api/v1/auth/login · GET /api/v1/auth/me
 *
 * Recorren el controlador de auth completo, que hasta ahora solo se ejercía
 * indirectamente desde los casos de uso.
 */

const REGISTRO = '/api/v1/auth/register'
const LOGIN = '/api/v1/auth/login'
const PERFIL = '/api/v1/auth/me'

// El registro exige un dominio permitido y una contraseña con mayúscula, minúscula y número.
const CREDENCIALES = { email: 'nuevo@gmail.com', password: 'Password123' }

describe('POST /auth/register', () => {
  it('body inválido → 400 Datos inválidos', async () => {
    // Act
    const res = await request(app).post(REGISTRO).send({ email: 'no-es-email' })

    // Assert
    expect(res.status).to.equal(400)
    expect(res.body.error).to.equal('Datos inválidos')
    expect(prismaMock.user.create.mock.calls).to.be.empty
  })

  it('email ya registrado → 409', async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue(
      usuario({ email: CREDENCIALES.email }),
    )

    // Act
    const res = await request(app)
      .post(REGISTRO)
      .send({ ...CREDENCIALES, name: 'Persona Nueva' })

    // Assert
    expect(res.status).to.equal(409)
    expect(res.body.error).to.equal('El email ya está registrado')
  })

  it('datos correctos → 201 con el usuario y su token, sin la contraseña', async () => {
    // Arrange
    const creado = usuario({ email: CREDENCIALES.email, name: 'Persona Nueva' })
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue(creado)

    // Act
    const res = await request(app)
      .post(REGISTRO)
      .send({ ...CREDENCIALES, name: 'Persona Nueva' })

    // Assert
    expect(res.status).to.equal(201)
    expect(res.body.data.user.email).to.equal(CREDENCIALES.email)
    expect(res.body.data.user).to.not.have.property('password')
    expect(typeof res.body.data.token).to.equal('string')
  })
})

describe('POST /auth/login', () => {
  it('credenciales incorrectas → 401', async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue(null)

    // Act
    const res = await request(app).post(LOGIN).send(CREDENCIALES)

    // Assert
    expect(res.status).to.equal(401)
    expect(res.body.error).to.equal('Credenciales inválidas')
  })

  it('cuenta suspendida → 403 con el motivo', async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue(
      usuario({
        email: CREDENCIALES.email,
        password: CREDENCIALES.password,
        banned: true,
        banReason: 'fraude en pagos',
      }),
    )

    // Act
    const res = await request(app).post(LOGIN).send(CREDENCIALES)

    // Assert
    expect(res.status).to.equal(403)
    expect(res.body.error).to.include('fraude en pagos')
  })

  it('credenciales correctas → 200 con el token', async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue(
      usuario({ email: CREDENCIALES.email, password: CREDENCIALES.password }),
    )

    // Act
    const res = await request(app).post(LOGIN).send(CREDENCIALES)

    // Assert
    expect(res.status).to.equal(200)
    expect(typeof res.body.data.token).to.equal('string')
    expect(res.body.data.user).to.not.have.property('password')
  })
})

describe('GET /auth/me', () => {
  it('sin token → 401', async () => {
    // Act
    const res = await request(app).get(PERFIL)

    // Assert
    expect(res.status).to.equal(401)
    expect(res.body.error).to.equal('Token requerido')
  })

  it('token con firma inválida → 401', async () => {
    // Act
    const res = await request(app)
      .get(PERFIL)
      .set('Authorization', `Bearer ${tokenConFirmaInvalida()}`)

    // Assert
    expect(res.status).to.equal(401)
  })

  it('token válido → 200 con el perfil completo leído de la base', async () => {
    // Arrange
    const { user, token } = autenticar({ name: 'Persona Registrada' })

    // Act
    const res = await request(app)
      .get(PERFIL)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    // El JWT solo carga id y role: name y email tienen que venir de la base.
    expect(res.status).to.equal(200)
    expect(res.body.data).to.deep.include({
      id: user.id,
      email: user.email,
      name: 'Persona Registrada',
    })
    expect(res.body.data).to.not.have.property('password')
  })

  it('el usuario del token ya no existe → 401', async () => {
    // Arrange
    const { token } = autenticar()
    // Entre la emisión del token y esta petición borraron la cuenta.
    prismaMock.user.findUnique.mockResolvedValue(null)

    // Act
    const res = await request(app)
      .get(PERFIL)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(401)
  })
})
