import { afterEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { prismaMock } from '../helpers/prisma-mock'
import { ID_INEXISTENTE, autenticar, autenticarAdmin, usuarioConConteo } from '../helpers/fixtures'

/**
 * ESC-27 — Desbanear usuario: contrato de la respuesta, casos borde y seguridad.
 * Complementa los 5 caminos básicos de esc-27-desbanear-usuario.test.ts.
 */

const RUTA = (id: string) => `/api/v1/admin/users/${id}/unban`

function desbanearComoAdmin(id: string, filaActualizada = usuarioConConteo({ id, banned: false, banReason: null })) {
  const { token } = autenticarAdmin()
  prismaMock.user.update.mockResolvedValue(filaActualizada)
  return request(app).put(RUTA(id)).set('Authorization', `Bearer ${token}`)
}

describe('ESC-27 — Desbanear usuario: contrato de la respuesta', () => {
  it('responde 200 con el usuario dentro de { data }', async () => {
    const res = await desbanearComoAdmin('user-9')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body.data.id).toBe('user-9')
  })

  it('el usuario queda activo: banned = false', async () => {
    const res = await desbanearComoAdmin('user-9')

    expect(res.body.data.banned).toBe(false)
  })

  it('el motivo de la suspensión queda en null', async () => {
    const res = await desbanearComoAdmin('user-9')

    expect(res.body.data.banReason).toBeNull()
  })

  it('la fecha de la suspensión queda en null', async () => {
    const res = await desbanearComoAdmin('user-9')

    expect(res.body.data.bannedAt).toBeNull()
  })

  it('la contraseña nunca sale en la respuesta', async () => {
    const res = await desbanearComoAdmin('user-9')

    expect(res.body.data).not.toHaveProperty('password')
  })

  it('devuelve solo los campos públicos del usuario', async () => {
    const res = await desbanearComoAdmin('user-9')

    expect(Object.keys(res.body.data).sort()).toEqual(
      ['banReason', 'banned', 'bannedAt', 'createdAt', 'email', 'id', 'name', 'orderCount', 'role', 'updatedAt'],
    )
  })

  it('el conteo de pedidos sale como orderCount', async () => {
    const res = await desbanearComoAdmin('user-9', usuarioConConteo({ id: 'user-9', orders: 3 }))

    expect(res.body.data.orderCount).toBe(3)
  })
})

describe('ESC-27 — Desbanear usuario: lo que se guarda', () => {
  it('limpia los tres campos de la suspensión en una sola actualización', async () => {
    await desbanearComoAdmin('user-9')

    expect(prismaMock.user.update).toHaveBeenCalledTimes(1)
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { banned: false, banReason: null, bannedAt: null } }),
    )
  })

  it('actualiza exactamente el usuario de la ruta', async () => {
    await desbanearComoAdmin('user-42')

    expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'user-42' } }))
  })

  it('desbanear a un usuario que ya estaba activo responde 200 (operación idempotente)', async () => {
    const res = await desbanearComoAdmin('user-activo', usuarioConConteo({ id: 'user-activo', banned: false }))

    expect(res.status).toBe(200)
    expect(res.body.data.banned).toBe(false)
  })

  it('un administrador puede desbanear a otro administrador', async () => {
    const res = await desbanearComoAdmin('admin-2', usuarioConConteo({ id: 'admin-2', role: 'ADMIN', banned: false }))

    expect(res.status).toBe(200)
    expect(res.body.data.role).toBe('ADMIN')
  })
})

describe('ESC-27 — Desbanear usuario: seguridad y errores', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('un administrador suspendido no puede desbanear a nadie → 403', async () => {
    const { token } = autenticar({ role: 'ADMIN', banned: true, banReason: 'auditoría' })

    const res = await request(app).put(RUTA('user-9')).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Tu cuenta ha sido suspendida. Motivo: auditoría')
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('un token de un usuario que ya no existe → 401 y no se toca la base', async () => {
    const { token } = autenticarAdmin()
    prismaMock.user.findUnique.mockResolvedValue(null)

    const res = await request(app).put(RUTA('user-9')).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token inválido o expirado')
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('un fallo inesperado de la base → 500 con el mensaje genérico', async () => {
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockRejectedValue(new Error('conexión perdida con la base de datos'))

    const res = await request(app).put(RUTA(ID_INEXISTENTE)).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Error interno del servidor')
  })

  it('en producción ese fallo no expone el detalle interno', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockRejectedValue(new Error('conexión perdida con la base de datos'))

    const res = await request(app).put(RUTA(ID_INEXISTENTE)).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'Error interno del servidor' })
  })

  it('la respuesta no se guarda en caché (Cache-Control: no-store)', async () => {
    const res = await desbanearComoAdmin('user-9')

    expect(res.headers['cache-control']).toBe('no-store')
  })

  it('la ruta solo acepta PUT: GET → 404', async () => {
    const { token } = autenticarAdmin()

    const res = await request(app).get(RUTA('user-9')).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('no hace falta cuerpo: un cuerpo cualquiera se ignora y no modifica otros campos', async () => {
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockResolvedValue(usuarioConConteo({ id: 'user-9' }))

    const res = await request(app)
      .put(RUTA('user-9'))
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'ADMIN', email: 'otro@gmail.com' })

    expect(res.status).toBe(200)
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { banned: false, banReason: null, bannedAt: null } }),
    )
  })
})
