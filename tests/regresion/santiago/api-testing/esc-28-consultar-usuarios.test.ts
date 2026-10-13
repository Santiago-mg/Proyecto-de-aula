import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../../../src/app'
import { consultaDe, prismaMock } from '../../../helpers/prisma-mock'
import { autenticarAdmin, usuarioConConteo } from '../../../helpers/fixtures'

/**
 * ESC-28 — Consultar usuarios · API testing
 * GET /api/v1/admin/users?page&limit&search
 *
 * Contrato HTTP del listado paginado: forma exacta de { data, meta }, el
 * cálculo de totalPages en sus valores límite, la traducción de page/limit a
 * skip/take y los parámetros inválidos.
 */

const RUTA = '/api/v1/admin/users'

const CAMPOS_USUARIO_ADMIN = [
  'id', 'email', 'name', 'role', 'banned', 'banReason', 'bannedAt',
  'createdAt', 'updatedAt', 'orderCount',
]

/** Programa el conteo y la página que devuelve la base. */
function conUsuarios(total: number, filas = [usuarioConConteo()]) {
  prismaMock.user.count.mockResolvedValue(total)
  prismaMock.user.findMany.mockResolvedValue(filas)
}

describe('ESC-28 · API — consultar usuarios', () => {
  it('200: { data, meta } con los campos exactos de cada usuario y de la paginación', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    conUsuarios(1, [usuarioConConteo({ orders: 4 })])

    // Act
    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(200)
    expect(res.headers['content-type']).to.match(/^application\/json/)
    expect(res.body).to.have.all.keys('data', 'meta')
    expect(res.body.data[0]).to.have.all.keys(CAMPOS_USUARIO_ADMIN)
    expect(res.body.data[0].orderCount).to.equal(4)
    expect(res.body.meta).to.deep.equal({ total: 1, page: 1, limit: 20, totalPages: 1 })
  })

  it.each([
    [0, 20, 0],
    [1, 20, 1],
    [20, 20, 1],
    [21, 20, 2],
    [50, 50, 1],
    [51, 50, 2],
  ])('total=%i con limit=%i → totalPages=%i', async (total, limit, totalPages) => {
    // Arrange
    const { token } = autenticarAdmin()
    conUsuarios(total, [])

    // Act
    const res = await request(app)
      .get(`${RUTA}?limit=${limit}`)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(200)
    expect(res.body.meta).to.include({ total, limit, totalPages })
  })

  it.each([
    [1, 20, 0],
    [2, 20, 20],
    [3, 10, 20],
    [5, 50, 200],
  ])('page=%i y limit=%i → la base salta %i filas', async (page, limit, skip) => {
    // Arrange
    const { token } = autenticarAdmin()
    conUsuarios(0, [])

    // Act
    await request(app)
      .get(`${RUTA}?page=${page}&limit=${limit}`)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(consultaDe(prismaMock.user.findMany)).to.deep.include({ skip, take: limit })
  })

  it.each([
    ['page=0', 'page'],
    ['page=-1', 'page'],
    ['page=dos', 'page'],
    ['limit=0', 'limit'],
    ['limit=51', 'limit'],
    ['limit=2.5', 'limit'],
  ])('?%s → 400 con el error en el campo %s', async (query, campo) => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    const res = await request(app)
      .get(`${RUTA}?${query}`)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(400)
    expect(res.body.error).to.equal('Datos inválidos')
    expect(res.body.errors.map((e: { field: string }) => e.field)).to.deep.equal([campo])
    expect(prismaMock.user.findMany.mock.calls).to.be.empty
  })

  it('una página más allá del total → 200 con la lista vacía, no un error', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    conUsuarios(3, [])

    // Act
    const res = await request(app)
      .get(`${RUTA}?page=99`)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(200)
    expect(res.body.data).to.be.an('array').that.is.empty
    expect(res.body.meta).to.include({ page: 99, totalPages: 1 })
  })

  it('search vacío equivale a no filtrar', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    conUsuarios(0, [])

    // Act
    await request(app).get(`${RUTA}?search=`).set('Authorization', `Bearer ${token}`)

    // Assert
    expect(consultaDe(prismaMock.user.findMany)).to.deep.include({ where: {} })
  })
})
