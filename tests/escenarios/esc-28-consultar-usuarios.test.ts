import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { prismaMock } from '../helpers/prisma-mock'
import {
  ID_USUARIO,
  autenticarComo,
  filaUsuario,
  tokenConFirmaInvalida,
} from '../helpers/datos'

/**
 * ESC-28 — Consultar usuarios
 * GET /api/v1/admin/users
 *
 * V(G) = 6, así que son 6 caminos básicos. Los dos últimos se separan según
 * llegue o no el parámetro `search`, que es lo que decide si el repositorio
 * arma un WHERE con OR o lo deja vacío.
 */

const RUTA = '/api/v1/admin/users'

/** Prepara el listado que devuelve el repositorio (count + findMany). */
function simularListado(usuarios: unknown[], total = usuarios.length) {
  prismaMock.user.count.mockResolvedValue(total)
  prismaMock.user.findMany.mockResolvedValue(usuarios)
}

// Cada prueba arranca con los mocks en blanco, así ninguna pasa "de rebote"
// por lo que dejó configurado la anterior.
beforeEach(() => {
  vi.resetAllMocks()
})

describe('ESC-28 — Consultar usuarios', () => {
  it('Camino 1 (1-2-14): sin cabecera Bearer → 401 Token requerido', async () => {
    const res = await request(app).get(RUTA)

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token requerido')
    expect(prismaMock.user.findMany).not.toHaveBeenCalled()
  })

  it('Camino 2 (1-3-4-14): firma inválida → 401 Token inválido o expirado', async () => {
    const res = await request(app)
      .get(RUTA)
      .set('Authorization', `Bearer ${tokenConFirmaInvalida()}`)

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token inválido o expirado')
    expect(prismaMock.user.findMany).not.toHaveBeenCalled()
  })

  it('Camino 3 (1-3-5-6-14): rol USER → 403 Acceso restringido', async () => {
    const token = autenticarComo({ id: ID_USUARIO, role: 'USER' })

    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Acceso restringido a administradores')
    expect(prismaMock.user.findMany).not.toHaveBeenCalled()
  })

  it('Camino 4 (1-3-5-7-8-14): page inválido → 400 Datos inválidos', async () => {
    const token = autenticarComo()

    // page debe ser un entero positivo; 0 no pasa el esquema.
    const res = await request(app)
      .get(`${RUTA}?page=0`)
      .set('Authorization', `Bearer ${token}`)

    // El ZodError lo traduce la red de seguridad de error.middleware.
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Datos inválidos')
    expect(prismaMock.user.findMany).not.toHaveBeenCalled()
  })

  it('Camino 5 (1-3-5-7-9-10-12-13-14): con search → 200 con la lista filtrada', async () => {
    const token = autenticarComo()
    simularListado([filaUsuario({ name: 'Prueba Uno', email: 'prueba1@correo.com' })])

    const res = await request(app)
      .get(`${RUTA}?search=prueba1`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)

    // El filtro busca en nombre y correo, sin distinguir mayúsculas.
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: 'prueba1', mode: 'insensitive' } },
            { email: { contains: 'prueba1', mode: 'insensitive' } },
          ],
        },
      }),
    )
  })

  it('Camino 6 (1-3-5-7-9-11-12-13-14): sin search → 200 con la lista completa paginada', async () => {
    const token = autenticarComo()
    simularListado([filaUsuario(), filaUsuario({ id: 'otro-id' })], 10)

    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)

    // Sin search el WHERE queda vacío y aplican los valores por defecto.
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, skip: 0, take: 20 }),
    )
    expect(res.body.meta).toEqual({
      total: 10,
      page: 1,
      limit: 20,
      totalPages: 1,
    })
  })

  it('La contraseña nunca sale en el listado', async () => {
    const token = autenticarComo()
    simularListado([filaUsuario()])

    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data[0]).not.toHaveProperty('password')
  })
})
