import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../../../src/app'
import { consultaDe, prismaMock } from '../../../helpers/prisma-mock'
import { autenticarAdmin, usuarioConConteo } from '../../../helpers/fixtures'
import { AdminRepository } from '../../../../src/infrastructure/repositories/AdminRepository'
import prisma from '../../../../src/infrastructure/database/prisma'
import { baseConLatencia, mediana, medir, repetir } from '../helpers/medicion'

/**
 * ESC-28 — Consultar usuarios · performance-testing
 * GET /api/v1/admin/users
 *
 * El listado hace dos consultas independientes (el conteo y la página) y las
 * lanza a la vez con Promise.all. Se compara contra una versión de referencia
 * que las hace una después de la otra: si alguien cambia el Promise.all por
 * dos await seguidos, la latencia del listado se duplica y estas pruebas lo
 * detectan.
 */

const PRESUPUESTO_MS = 500
const LATENCIA_BASE_MS = 40
const RUTA = '/api/v1/admin/users'

/** Referencia secuencial: mismas consultas, pero cada una espera a la anterior. */
async function listarEnSerie(page: number, limit: number) {
  const total = await prisma.user.count({ where: {} })
  const users = await prisma.user.findMany({ where: {}, skip: (page - 1) * limit, take: limit })
  return { total, users }
}

describe('ESC-28 · Performance — consultar usuarios', () => {
  it('el listado produce el resultado correcto', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.count.mockResolvedValue(2)
    prismaMock.user.findMany.mockResolvedValue([usuarioConConteo(), usuarioConConteo()])

    // Act
    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(200)
    expect(res.body.data).to.have.lengthOf(2)
    expect(res.body.meta.total).to.equal(2)
  })

  it('una página inválida se rechaza sin consultar la tabla', async () => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    const res = await request(app).get(`${RUTA}?page=0`).set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(400)
    expect(prismaMock.user.count.mock.calls).to.be.empty
    expect(prismaMock.user.findMany.mock.calls).to.be.empty
  })

  it('una página completa de 50 usuarios cumple el presupuesto educativo', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.count.mockResolvedValue(5_000)
    prismaMock.user.findMany.mockResolvedValue(Array.from({ length: 50 }, () => usuarioConConteo({ orders: 7 })))
    const listar = () => request(app).get(`${RUTA}?limit=50`).set('Authorization', `Bearer ${token}`)
    await listar() // calentamiento

    // Act
    const { resultado: res, ms } = await medir(listar)

    // Assert
    expect(res.body.data).to.have.lengthOf(50)
    expect(ms, `La petición tardó ${ms.toFixed(3)} ms`).to.be.below(PRESUPUESTO_MS)
  })

  it('la página nunca pide más de 50 filas, aunque la tabla tenga 5.000', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.count.mockResolvedValue(5_000)
    prismaMock.user.findMany.mockResolvedValue([])

    // Act
    await request(app).get(`${RUTA}?limit=50&page=7`).set('Authorization', `Bearer ${token}`)

    // Assert
    expect(consultaDe(prismaMock.user.findMany)).to.deep.include({ take: 50, skip: 300 })
  })

  it('el conteo y la página se consultan a la vez, no una tras otra', async () => {
    // Arrange
    const base = baseConLatencia(LATENCIA_BASE_MS)
    prismaMock.user.count.mockImplementation(base.responder(0))
    prismaMock.user.findMany.mockImplementation(base.responder([]))

    // Act
    await new AdminRepository().listUsers(1, 20)

    // Assert
    // Determinista: no depende del reloj, solo de cuántas había en vuelo.
    expect(base.consultas).to.equal(2)
    expect(base.maximoEnVuelo()).to.equal(2)
  })

  it('consultar en paralelo es más rápido que la referencia en serie (mediana de 5)', async () => {
    // Arrange
    const base = baseConLatencia(LATENCIA_BASE_MS)
    prismaMock.user.count.mockImplementation(base.responder(0))
    prismaMock.user.findMany.mockImplementation(base.responder([]))
    const repositorio = new AdminRepository()

    // Act
    const tiemposParalelo = await repetir(() => repositorio.listUsers(1, 20), 5)
    const tiemposEnSerie = await repetir(() => listarEnSerie(1, 20), 5)

    // Assert
    expect(mediana(tiemposParalelo)).to.be.below(mediana(tiemposEnSerie))
  })
})
