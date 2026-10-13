import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../../../src/app'
import { prismaMock } from '../../../helpers/prisma-mock'
import { autenticarAdmin, usuarioConConteo } from '../../../helpers/fixtures'
import { baseConLatencia, mediana, medir, repetir } from '../helpers/medicion'

/**
 * ESC-26 — Banear usuario · performance-testing
 * PUT /api/v1/admin/users/:id/ban
 *
 * Banear es una sola escritura. Lo que se protege es que siga siéndolo: que
 * no cargue los pedidos del usuario para contarlos, que no haga una lectura
 * extra antes de escribir y que la validación corte antes de ir a la base.
 */

const PRESUPUESTO_MS = 500
const LATENCIA_BASE_MS = 30
const RUTA = (id: string) => `/api/v1/admin/users/${id}/ban`

describe('ESC-26 · Performance — banear usuario', () => {
  it('el baneo produce el resultado correcto', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockResolvedValue(usuarioConConteo({ banned: true, banReason: 'spam masivo' }))

    // Act
    const res = await request(app).put(RUTA('user-ana')).set('Authorization', `Bearer ${token}`).send({ reason: 'spam masivo' })

    // Assert
    expect(res.status).to.equal(200)
    expect(res.body.data).to.include({ banned: true, banReason: 'spam masivo' })
  })

  it('un motivo inválido se rechaza sin escribir en la base', async () => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    const res = await request(app).put(RUTA('user-ana')).set('Authorization', `Bearer ${token}`).send({ reason: 'ab' })

    // Assert
    expect(res.status).to.equal(400)
    expect(prismaMock.user.update.mock.calls).to.be.empty
  })

  it('banear cumple el presupuesto educativo', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockResolvedValue(usuarioConConteo({ banned: true }))
    const banear = () => request(app).put(RUTA('user-ana')).set('Authorization', `Bearer ${token}`).send({ reason: 'spam masivo' })
    await banear() // calentamiento

    // Act
    const { resultado: res, ms } = await medir(banear)

    // Assert
    expect(res.status).to.equal(200)
    expect(ms, `La petición tardó ${ms.toFixed(3)} ms`).to.be.below(PRESUPUESTO_MS)
  })

  it('costo constante: una lectura de sesión y una escritura, tenga los pedidos que tenga', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockResolvedValue(usuarioConConteo({ banned: true, orders: 10_000 }))

    // Act
    const res = await request(app).put(RUTA('user-ana')).set('Authorization', `Bearer ${token}`).send({ reason: 'spam masivo' })

    // Assert
    // El conteo de pedidos sale de _count en la misma escritura: no se leen
    // los 10.000 pedidos ni se hace una consulta aparte para contarlos.
    expect(res.body.data.orderCount).to.equal(10_000)
    expect(prismaMock.user.findUnique.mock.calls).to.have.lengthOf(1) // la sesión
    expect(prismaMock.user.update.mock.calls).to.have.lengthOf(1)
    expect(prismaMock.order.findMany.mock.calls).to.be.empty
    expect(prismaMock.order.count.mock.calls).to.be.empty
  })

  it('validar antes de escribir es más rápido que ir a la base (mediana de 5)', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const base = baseConLatencia(LATENCIA_BASE_MS)
    prismaMock.user.update.mockImplementation(base.responder(usuarioConConteo({ banned: true })))
    const banear = (reason: string) => () =>
      request(app).put(RUTA('user-ana')).set('Authorization', `Bearer ${token}`).send({ reason })

    // Act
    const tiemposInvalido = await repetir(banear('ab'), 5)
    const tiemposValido = await repetir(banear('spam masivo'), 5)

    // Assert
    // El motivo inválido no llega a la base, así que se ahorra su latencia.
    expect(mediana(tiemposInvalido)).to.be.below(mediana(tiemposValido))
    expect(base.consultas).to.equal(5)
  })
})
