import { beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { limpiarBaseDeDatos } from '../helpers/db'
import { crearAdminAutenticado, crearUsuarioAutenticado, tokenConFirmaInvalida } from '../helpers/fixtures'

/**
 * ESC-28 — Consultar usuarios
 * GET /api/v1/admin/users
 *
 * V(G) = 6, así que son 6 caminos básicos. Los dos últimos se separan según
 * llegue o no el parámetro `search`, que es lo que decide si el repositorio
 * arma un WHERE con OR o lo deja vacío. Contra Postgres real, sin mocks.
 */

const RUTA = '/api/v1/admin/users'

beforeEach(async () => {
  await limpiarBaseDeDatos()
})

describe('ESC-28 — Consultar usuarios', () => {
  it('Camino 1 (1-2-14): sin cabecera Bearer → 401 Token requerido', async () => {
    const res = await request(app).get(RUTA)

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token requerido')
  })

  it('Camino 2 (1-3-4-14): firma inválida → 401 Token inválido o expirado', async () => {
    const res = await request(app)
      .get(RUTA)
      .set('Authorization', `Bearer ${tokenConFirmaInvalida()}`)

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token inválido o expirado')
  })

  it('Camino 3 (1-3-5-6-14): rol USER → 403 Acceso restringido', async () => {
    const { token } = await crearUsuarioAutenticado()

    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Acceso restringido a administradores')
  })

  it('Camino 4 (1-3-5-7-8-14): page inválido → 400 Datos inválidos', async () => {
    const { token } = await crearAdminAutenticado()

    // page debe ser un entero positivo; 0 no pasa el esquema.
    const res = await request(app)
      .get(`${RUTA}?page=0`)
      .set('Authorization', `Bearer ${token}`)

    // El ZodError lo traduce la red de seguridad de error.middleware.
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Datos inválidos')
  })

  it('Camino 5 (1-3-5-7-9-10-12-13-14): con search → 200 con la lista filtrada', async () => {
    const { token } = await crearAdminAutenticado()
    await crearUsuarioAutenticado({ name: 'Prueba Uno', email: 'prueba1@correo.com' })
    await crearUsuarioAutenticado({ name: 'Otro nombre', email: 'otro@correo.com' })

    const res = await request(app)
      .get(`${RUTA}?search=prueba1`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].email).toBe('prueba1@correo.com')
  })

  it('Camino 6 (1-3-5-7-9-11-12-13-14): sin search → 200 con la lista completa paginada', async () => {
    const { token } = await crearAdminAutenticado()
    await crearUsuarioAutenticado()
    await crearUsuarioAutenticado()

    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    // El admin que hace la petición también cuenta: 1 admin + 2 usuarios.
    expect(res.body.data).toHaveLength(3)
    expect(res.body.meta).toEqual({ total: 3, page: 1, limit: 20, totalPages: 1 })
  })

  it('La contraseña nunca sale en el listado', async () => {
    const { token } = await crearAdminAutenticado()

    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data[0]).not.toHaveProperty('password')
  })
})
