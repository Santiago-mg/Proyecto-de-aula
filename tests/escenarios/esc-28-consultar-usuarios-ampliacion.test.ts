import { describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { prismaMock } from '../helpers/prisma-mock'
import { autenticarAdmin, usuarioConConteo } from '../helpers/fixtures'

/**
 * ESC-28 — Consultar usuarios registrados: límites de los parámetros, paginación,
 * búsqueda y forma de cada fila. Complementa los 7 casos de esc-28-consultar-usuarios.test.ts.
 */

const RUTA = '/api/v1/admin/users'

function listarComoAdmin(query: string, filas = [usuarioConConteo()], total = filas.length) {
  const { token } = autenticarAdmin()
  prismaMock.user.count.mockResolvedValue(total)
  prismaMock.user.findMany.mockResolvedValue(filas)
  return request(app).get(`${RUTA}${query}`).set('Authorization', `Bearer ${token}`)
}

describe('ESC-28 — Consultar usuarios: límites de los parámetros', () => {
  it.each([
    ['limit mayor que 50', '?limit=51'],
    ['limit en 0', '?limit=0'],
    ['page negativo', '?page=-1'],
    ['limit no numérico', '?limit=muchos'],
  ])('%s → 400 Datos inválidos, sin consultar la base', async (_caso, query) => {
    const res = await listarComoAdmin(query)

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Datos inválidos')
    expect(prismaMock.user.findMany).not.toHaveBeenCalled()
  })
})

describe('ESC-28 — Consultar usuarios: paginación', () => {
  it('sin parámetros usa la página 1 con 20 usuarios', async () => {
    await listarComoAdmin('')

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 20 }))
  })

  it('page=3 y limit=10 salta los primeros 20 usuarios', async () => {
    await listarComoAdmin('?page=3&limit=10')

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 10 }))
  })

  it('totalPages se redondea hacia arriba: 45 usuarios de a 20 son 3 páginas', async () => {
    const res = await listarComoAdmin('?limit=20', [usuarioConConteo()], 45)

    expect(res.body.meta).toEqual({ total: 45, page: 1, limit: 20, totalPages: 3 })
  })

  it('una página más allá del final responde 200 con la lista vacía', async () => {
    const res = await listarComoAdmin('?page=9', [], 12)

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
    expect(res.body.meta.totalPages).toBe(1)
  })
})

describe('ESC-28 — Consultar usuarios: búsqueda, orden y filas', () => {
  it('la búsqueda compara nombre y correo sin distinguir mayúsculas', async () => {
    await listarComoAdmin('?search=Ana')

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: 'Ana', mode: 'insensitive' } },
            { email: { contains: 'Ana', mode: 'insensitive' } },
          ],
        },
      }),
    )
  })

  it('el total también se cuenta con el mismo filtro de búsqueda', async () => {
    await listarComoAdmin('?search=gmail')

    expect(prismaMock.user.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
    )
  })

  it('los usuarios más recientes salen primero', async () => {
    await listarComoAdmin('')

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { createdAt: 'desc' } }))
  })

  it('cada fila trae su cantidad de pedidos (orderCount)', async () => {
    const res = await listarComoAdmin('', [usuarioConConteo({ id: 'u-1', orders: 4 })])

    expect(res.body.data[0].orderCount).toBe(4)
  })

  it('los usuarios suspendidos aparecen con su estado y su motivo', async () => {
    const res = await listarComoAdmin('', [usuarioConConteo({ id: 'u-2', banned: true, banReason: 'spam reiterado' })])

    expect(res.body.data[0]).toMatchObject({ banned: true, banReason: 'spam reiterado' })
  })

  it('la respuesta no se guarda en caché (Cache-Control: no-store)', async () => {
    const res = await listarComoAdmin('')

    expect(res.headers['cache-control']).toBe('no-store')
  })
})
