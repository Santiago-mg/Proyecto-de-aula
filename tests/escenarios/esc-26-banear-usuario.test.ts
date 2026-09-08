import { beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { limpiarBaseDeDatos } from '../helpers/db'
import {
  ID_INEXISTENTE,
  crearAdminAutenticado,
  crearUsuarioAutenticado,
  tokenConFirmaInvalida,
} from '../helpers/fixtures'

/**
 * ESC-26 — Banear usuario
 * PUT /api/v1/admin/users/:id/ban
 *
 * Una prueba por cada camino básico del grafo de flujo.
 * V(G) = 7, así que son 7 caminos. Todo corre contra Postgres real: no hay
 * ningún mock, ni de la base de datos ni de nada más.
 */

const RUTA = (id: string) => `/api/v1/admin/users/${id}/ban`
const MOTIVO = { reason: 'fraude en pagos' }

beforeEach(async () => {
  await limpiarBaseDeDatos()
})

describe('ESC-26 — Banear usuario', () => {
  it('Camino 1 (1-2-14): sin cabecera Bearer → 401 Token requerido', async () => {
    const res = await request(app).put(RUTA(ID_INEXISTENTE)).send(MOTIVO)

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token requerido')
  })

  it('Camino 2 (1-3-4-14): firma inválida → 401 Token inválido o expirado', async () => {
    const res = await request(app)
      .put(RUTA(ID_INEXISTENTE))
      .set('Authorization', `Bearer ${tokenConFirmaInvalida()}`)
      .send(MOTIVO)

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token inválido o expirado')
  })

  it('Camino 3 (1-3-5-6-14): rol USER → 403 Acceso restringido', async () => {
    const { user, token } = await crearUsuarioAutenticado()

    const res = await request(app)
      .put(RUTA(user.id))
      .set('Authorization', `Bearer ${token}`)
      .send(MOTIVO)

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Acceso restringido a administradores')
  })

  it('Camino 4 (1-3-5-7-8-14): reason con menos de 4 caracteres → 400 Datos inválidos', async () => {
    const { user, token } = await crearAdminAutenticado()

    const res = await request(app)
      .put(RUTA(user.id))
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'ab' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Datos inválidos')
  })

  it('Camino 5 (1-3-5-7-9-10-14): un admin no puede banearse a sí mismo (RN-05) → 400', async () => {
    const { user, token } = await crearAdminAutenticado()

    const res = await request(app)
      .put(RUTA(user.id))
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'autobaneo de prueba' })

    // DEF-26-02 corregido: antes respondía 200 y el admin se dejaba fuera del panel.
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('No puedes banear tu propia cuenta')
  })

  it('Camino 6 (1-3-5-7-9-11-12-14): el id no existe → 404 Usuario no encontrado', async () => {
    const { token } = await crearAdminAutenticado()

    const res = await request(app)
      .put(RUTA(ID_INEXISTENTE))
      .set('Authorization', `Bearer ${token}`)
      .send(MOTIVO)

    // DEF-26-01 corregido: antes el P2025 de Prisma salía como 500.
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Usuario no encontrado')
  })

  it('Camino 7 (1-3-5-7-9-11-13-14): datos correctos → 200 con el usuario baneado', async () => {
    const { token } = await crearAdminAutenticado()
    const { user: victima } = await crearUsuarioAutenticado()

    const res = await request(app)
      .put(RUTA(victima.id))
      .set('Authorization', `Bearer ${token}`)
      .send(MOTIVO)

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      id: victima.id,
      banned: true,
      banReason: MOTIVO.reason,
    })
    expect(res.body.data.bannedAt).not.toBeNull()
    // La contraseña nunca debe viajar en la respuesta.
    expect(res.body.data).not.toHaveProperty('password')
  })
})
