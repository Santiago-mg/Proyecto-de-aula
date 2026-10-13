import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../../../src/app'
import { prismaMock } from '../../../helpers/prisma-mock'
import { autenticarAdmin } from '../../../helpers/fixtures'
import { pedidoReciente, programarEstadisticas } from '../helpers/estadisticas'

/**
 * ESC-29 — Panel de estadísticas · API testing
 * GET /api/v1/admin/stats
 *
 * El panel del front pinta cada número de esta respuesta, así que el contrato
 * es la forma completa del objeto: cada sección con sus campos exactos y
 * todos numéricos, los 7 días de ingresos y la ficha de los pedidos recientes.
 */

const RUTA = '/api/v1/admin/stats'

describe('ESC-29 · API — panel de estadísticas', () => {
  it('200: las cinco secciones del panel con sus campos exactos', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    programarEstadisticas({ usuarios: { total: 10 }, celulares: { total: 5, conStock: 3 } })

    // Act
    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(200)
    expect(res.headers['content-type']).to.match(/^application\/json/)
    const { data } = res.body
    expect(data).to.have.all.keys('users', 'phones', 'orders', 'revenueByDay', 'recentOrders')
    expect(data.users).to.have.all.keys('total', 'banned', 'newThisWeek', 'admins')
    expect(data.phones).to.have.all.keys('total', 'inStock', 'outOfStock', 'verified')
    expect(data.orders).to.have.all.keys(
      'total', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled',
      'revenue', 'revenueThisMonth',
    )
  })

  it('todos los indicadores son números, aunque la base no tenga datos', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    // Sin pedidos en el mes, Prisma devuelve _sum.total = null, no 0.
    programarEstadisticas({ ingresosDelMes: null })

    // Act
    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    // Assert
    const { users, phones, orders } = res.body.data
    for (const valor of [...Object.values(users), ...Object.values(phones), ...Object.values(orders)]) {
      expect(valor).to.be.a('number').and.to.be.at.least(0)
    }
  })

  it('revenueByDay trae siempre 7 días con { date, amount, count }', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    programarEstadisticas()

    // Act
    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    // Assert
    const dias = res.body.data.revenueByDay
    expect(dias).to.have.lengthOf(7)
    for (const dia of dias) {
      expect(dia).to.have.all.keys('date', 'amount', 'count')
      expect(dia.date).to.be.a('string').and.not.be.empty
    }
    // Cada día tiene su propia etiqueta: el front las usa como key de React.
    expect(new Set(dias.map((d: { date: string }) => d.date)).size).to.equal(7)
  })

  it('cada pedido reciente trae solo los 8 campos que muestra el panel', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    programarEstadisticas({ recientes: [pedidoReciente({ _count: { items: 3 } })] })

    // Act
    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    // Assert
    const [pedido] = res.body.data.recentOrders
    expect(pedido).to.have.all.keys(
      'id', 'orderRef', 'email', 'name', 'total', 'status', 'createdAt', 'itemCount',
    )
    expect(pedido.itemCount).to.equal(3)
  })

  it('el panel es de solo lectura: un POST sobre la misma ruta → 404', async () => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    const res = await request(app).post(RUTA).set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(404)
    expect(res.body).to.deep.equal({ error: 'Ruta no encontrada' })
    expect(prismaMock.order.groupBy.mock.calls).to.be.empty
  })
})
