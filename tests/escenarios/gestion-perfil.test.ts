import { describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { prismaMock } from '../helpers/prisma-mock'
import {
  autenticar,
  errorRegistroNoEncontrado,
  generarToken,
  usuario,
} from '../helpers/fixtures'

/**
 * Gestión de perfil — sobre la API completa
 * GET /auth/me · PATCH /auth/me · PUT /auth/me/password
 *
 * Las tres rutas actúan sobre la cuenta del token, nunca reciben un id: un
 * usuario no tiene forma de apuntar al perfil de otro.
 */

const PERFIL = '/api/v1/auth/me'
const PASSWORD = '/api/v1/auth/me/password'

describe('PATCH /auth/me — editar el nombre', () => {
  it('sin token → 401', async () => {
    const res = await request(app).patch(PERFIL).send({ name: 'Nuevo' })
    expect(res.status).toBe(401)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('nombre válido → 200 con el perfil actualizado y sin contraseña', async () => {
    const { user, token } = autenticar({ name: 'Ana' })
    prismaMock.user.update.mockResolvedValue({ ...user, name: 'Ana María' })

    const res = await request(app)
      .patch(PERFIL)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '  Ana María  ' })

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ id: user.id, name: 'Ana María' })
    expect(res.body.data).not.toHaveProperty('password')
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { name: 'Ana María' },
    })
  })

  it('nombre demasiado corto → 400 con el campo y el mensaje', async () => {
    const { token } = autenticar()

    const res = await request(app)
      .patch(PERFIL)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'A' })

    expect(res.status).toBe(400)
    expect(res.body.errors).toEqual([
      { field: 'name', message: 'El nombre debe tener al menos 2 caracteres' },
    ])
  })

  it('un body con role: ADMIN no cambia el rol', async () => {
    const { user, token } = autenticar()
    prismaMock.user.update.mockResolvedValue(user)

    await request(app)
      .patch(PERFIL)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ana', role: 'ADMIN' })

    expect(prismaMock.user.update.mock.calls[0][0].data).toEqual({ name: 'Ana' })
  })

  it('el usuario se elimina entre la autenticación y la escritura → 404', async () => {
    const { token } = autenticar()
    prismaMock.user.update.mockRejectedValue(errorRegistroNoEncontrado())

    const res = await request(app)
      .patch(PERFIL)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ana' })

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Usuario no encontrado')
  })

  it('cuenta suspendida → 403, no puede editar su perfil', async () => {
    const { token } = autenticar({ banned: true, banReason: 'fraude' })

    const res = await request(app)
      .patch(PERFIL)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ana' })

    expect(res.status).toBe(403)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })
})

describe('PUT /auth/me/password — cambiar la contraseña', () => {
  it('contraseña actual correcta y nueva válida → 204', async () => {
    const { user, token } = autenticar({ password: 'Actual123' })
    prismaMock.user.update.mockResolvedValue(user)

    const res = await request(app)
      .put(PASSWORD)
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Actual123', newPassword: 'Nueva1234' })

    expect(res.status).toBe(204)
    expect(prismaMock.user.update.mock.calls[0][0].data).toEqual({
      password: 'hash:Nueva1234',
    })
  })

  it('contraseña actual incorrecta → 400 (la sesión sigue abierta)', async () => {
    const { token } = autenticar({ password: 'Actual123' })

    const res = await request(app)
      .put(PASSWORD)
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Otra12345', newPassword: 'Nueva1234' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('La contraseña actual no es correcta')
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('contraseña nueva débil → 400 con la regla incumplida', async () => {
    const { token } = autenticar({ password: 'Actual123' })

    const res = await request(app)
      .put(PASSWORD)
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Actual123', newPassword: 'nueva1234' })

    expect(res.status).toBe(400)
    expect(res.body.errors).toEqual([
      {
        field: 'newPassword',
        message: 'La contraseña debe incluir al menos una letra mayúscula',
      },
    ])
  })

  it('después del cambio, la contraseña vieja ya no sirve para ingresar', async () => {
    // Arrange: el usuario ya quedó guardado con la contraseña nueva.
    const actualizado = usuario({ email: 'ana@gmail.com', password: 'Nueva1234' })
    prismaMock.user.findUnique.mockResolvedValue(actualizado)

    // Act
    const vieja = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ana@gmail.com', password: 'Actual123' })
    const nueva = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ana@gmail.com', password: 'Nueva1234' })

    // Assert
    expect(vieja.status).toBe(401)
    expect(nueva.status).toBe(200)
  })

  it('token de un usuario eliminado → 401', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    const token = generarToken({ id: 'eliminado', role: 'USER' })

    const res = await request(app)
      .put(PASSWORD)
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Actual123', newPassword: 'Nueva1234' })

    expect(res.status).toBe(401)
  })
})
