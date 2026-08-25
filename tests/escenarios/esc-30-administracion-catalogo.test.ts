import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { prismaMock } from '../helpers/prisma-mock'
import {
  ID_CELULAR,
  ID_INEXISTENTE,
  ID_USUARIO,
  autenticarComo,
  bodyCelularValido,
  filaCelular,
  tokenConFirmaInvalida,
} from '../helpers/datos'

/**
 * ESC-30 — Administración del catálogo
 * POST / PUT / DELETE /api/v1/phones
 *
 * V(G) = 10. El nodo 7 del grafo bifurca según el método HTTP, por eso los
 * caminos 4 a 10 se agrupan en POST, PUT y DELETE.
 */

const RUTA = '/api/v1/phones'

// Cada prueba arranca con los mocks en blanco, así ninguna pasa "de rebote"
// por lo que dejó configurado la anterior.
beforeEach(() => {
  vi.resetAllMocks()
})

describe('ESC-30 — Administración del catálogo', () => {
  it('Camino 1 (1-2-19): sin cabecera Bearer → 401 Token requerido', async () => {
    const res = await request(app).post(RUTA).send(bodyCelularValido())

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token requerido')
    expect(prismaMock.phone.create).not.toHaveBeenCalled()
  })

  it('Camino 2 (1-3-4-19): firma inválida → 401 Token inválido o expirado', async () => {
    const res = await request(app)
      .post(RUTA)
      .set('Authorization', `Bearer ${tokenConFirmaInvalida()}`)
      .send(bodyCelularValido())

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token inválido o expirado')
    expect(prismaMock.phone.create).not.toHaveBeenCalled()
  })

  it('Camino 3 (1-3-5-6-19): rol USER → 403 Acceso restringido', async () => {
    const token = autenticarComo({ id: ID_USUARIO, role: 'USER' })

    const res = await request(app)
      .post(RUTA)
      .set('Authorization', `Bearer ${token}`)
      .send(bodyCelularValido())

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Acceso restringido a administradores')
    expect(prismaMock.phone.create).not.toHaveBeenCalled()
  })

  it('Camino 4 (1-3-5-7-8-9-19): POST con body inválido → 400 Datos inválidos', async () => {
    const token = autenticarComo()

    // Falta `condition` y el precio es negativo.
    const res = await request(app)
      .post(RUTA)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...bodyCelularValido({ price: -100 }), condition: undefined })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Datos inválidos')
    expect(prismaMock.phone.create).not.toHaveBeenCalled()
  })

  it('Camino 5 (1-3-5-7-8-10-11-19): POST con un slug repetido (RN-01) → 409 Ya existe un celular con ese slug', async () => {
    const token = autenticarComo()

    // El slug ya está ocupado por otro celular.
    prismaMock.phone.findUnique.mockResolvedValue(filaCelular())

    const res = await request(app)
      .post(RUTA)
      .set('Authorization', `Bearer ${token}`)
      .send(bodyCelularValido({ slug: 'iphone-15-prueba' }))

    // DEF-30-01 corregido: antes salía 500 con el error crudo de Prisma y
    // la respuesta filtraba la ruta interna del archivo del repositorio.
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('Ya existe un celular con ese slug')
    expect(res.body).not.toHaveProperty('detail')
    expect(prismaMock.phone.create).not.toHaveBeenCalled()
  })

  it('Camino 6 (1-3-5-7-8-10-12-19): POST con body válido y slug libre → 201 celular creado', async () => {
    const token = autenticarComo()
    const body = bodyCelularValido()

    prismaMock.phone.findUnique.mockResolvedValue(null) // el slug está libre
    prismaMock.phone.create.mockResolvedValue(
      filaCelular({ slug: body.slug, name: body.name, brand: body.brand }),
    )

    const res = await request(app)
      .post(RUTA)
      .set('Authorization', `Bearer ${token}`)
      .send(body)

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ slug: body.slug, name: body.name })
    expect(prismaMock.phone.create).toHaveBeenCalledOnce()
  })

  it('Camino 7 (1-3-5-7-13-14-19): PUT sobre un id que no existe → 404 Celular no encontrado', async () => {
    const token = autenticarComo()
    prismaMock.phone.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .put(`${RUTA}/${ID_INEXISTENTE}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 2_000_000 })

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Celular no encontrado')
    expect(prismaMock.phone.update).not.toHaveBeenCalled()
  })

  it('Camino 8 (1-3-5-7-13-15-19): PUT sobre un celular existente → 200 actualizado', async () => {
    const token = autenticarComo()
    prismaMock.phone.findUnique.mockResolvedValue(filaCelular())
    prismaMock.phone.update.mockResolvedValue(filaCelular({ price: 2_000_000 }))

    const res = await request(app)
      .put(`${RUTA}/${ID_CELULAR}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 2_000_000 })

    expect(res.status).toBe(200)
    expect(res.body.data.price).toBe(2_000_000)
    expect(prismaMock.phone.update).toHaveBeenCalledOnce()
  })

  it('Camino 9 (1-3-5-7-16-17-19): DELETE sobre un id que no existe → 404 Celular no encontrado', async () => {
    const token = autenticarComo()
    prismaMock.phone.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .delete(`${RUTA}/${ID_INEXISTENTE}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Celular no encontrado')
    expect(prismaMock.phone.delete).not.toHaveBeenCalled()
  })

  it('Camino 10 (1-3-5-7-16-18-19): DELETE sobre un celular existente → 204 sin contenido', async () => {
    const token = autenticarComo()
    prismaMock.phone.findUnique.mockResolvedValue(filaCelular())
    prismaMock.phone.delete.mockResolvedValue(filaCelular())

    const res = await request(app)
      .delete(`${RUTA}/${ID_CELULAR}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(204)
    expect(res.body).toEqual({})
    expect(prismaMock.phone.delete).toHaveBeenCalledWith({
      where: { id: ID_CELULAR },
    })
  })
})
