import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { prismaMock } from '../helpers/prisma-mock'
import { autenticar, autenticarAdmin } from '../helpers/fixtures'

/**
 * Endpoints de pedidos
 * POST /orders · GET /orders/my · GET /orders · PUT /orders/:id/status
 *
 * Cubren el controlador de pedidos, que hasta ahora solo se ejercía desde
 * los casos de uso.
 */

const RUTA = '/api/v1/orders'
const PHONE_ID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301'
const ORDER_ID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

function bodyPedido() {
  return {
    email: 'ana@test.com',
    name: 'Ana Garcia',
    phone: '+57 300 123 4567',
    address: 'Calle 123 #45-67',
    city: 'Bogota',
    dept: 'Cundinamarca',
    items: [{ phoneId: PHONE_ID, qty: 1 }],
  }
}

function pedido(cambios: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    orderRef: 'CP-ABC123',
    userId: null,
    email: 'ana@test.com',
    name: 'Ana Garcia',
    phone: '+57 300 123 4567',
    address: 'Calle 123 #45-67',
    city: 'Bogota',
    dept: 'Cundinamarca',
    subtotal: 100_000,
    shipping: 20_000,
    total: 120_000,
    status: 'CONFIRMED',
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
    ...cambios,
  }
}

describe('POST /orders — crear pedido', () => {
  it('sin token → 401', async () => {
    // Act
    const res = await request(app).post(RUTA).send(bodyPedido())

    // Assert
    expect(res.status).to.equal(401)
  })

  it('body inválido → 400 Datos inválidos', async () => {
    // Arrange
    const { token } = autenticar()

    // Act
    const res = await request(app)
      .post(RUTA)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...bodyPedido(), items: [] })

    // Assert
    expect(res.status).to.equal(400)
    expect(res.body.error).to.equal('Datos inválidos')
  })

  it('celular inexistente → 404', async () => {
    // Arrange
    const { token } = autenticar()
    prismaMock.phone.findMany.mockResolvedValue([])

    // Act
    const res = await request(app)
      .post(RUTA)
      .set('Authorization', `Bearer ${token}`)
      .send(bodyPedido())

    // Assert
    expect(res.status).to.equal(404)
  })

  it('datos correctos → 201 con el pedido creado', async () => {
    // Arrange
    const { token } = autenticar()
    prismaMock.phone.findMany.mockResolvedValue([
      {
        id: PHONE_ID,
        name: 'Celular',
        price: 100_000,
        heroImage: null,
        stock: 5,
      },
    ])
    prismaMock.phone.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.order.create.mockResolvedValue(pedido())

    // Act
    const res = await request(app)
      .post(RUTA)
      .set('Authorization', `Bearer ${token}`)
      .send(bodyPedido())

    // Assert
    expect(res.status).to.equal(201)
    expect(res.body.data.orderRef).to.equal('CP-ABC123')
  })
})

describe('GET /orders/my — mis pedidos', () => {
  it('sin token → 401', async () => {
    // Act
    const res = await request(app).get(`${RUTA}/my`)

    // Assert
    expect(res.status).to.equal(401)
  })

  it('con token → 200 con los pedidos de ese usuario', async () => {
    // Arrange
    const { user, token } = autenticar()
    prismaMock.order.findMany.mockResolvedValue([pedido({ userId: user.id })])

    // Act
    const res = await request(app)
      .get(`${RUTA}/my`)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(200)
    expect(res.body.data).to.have.lengthOf(1)
  })
})

describe('GET /orders — listado de admin', () => {
  it('rol USER → 403', async () => {
    // Arrange
    const { token } = autenticar()

    // Act
    const res = await request(app)
      .get(RUTA)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(403)
  })

  it('admin → 200 con la lista paginada', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.order.count.mockResolvedValue(1)
    prismaMock.order.findMany.mockResolvedValue([pedido()])

    // Act
    const res = await request(app)
      .get(`${RUTA}?page=1&limit=10`)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(200)
    expect(res.body.meta).to.deep.include({ total: 1, page: 1, limit: 10 })
  })
})

describe('PUT /orders/:id/status — cambiar estado', () => {
  it('rol USER → 403', async () => {
    // Arrange
    const { token } = autenticar()

    // Act
    const res = await request(app)
      .put(`${RUTA}/${ORDER_ID}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'SHIPPED' })

    // Assert
    expect(res.status).to.equal(403)
  })

  it('estado inválido → 400 Datos inválidos', async () => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    const res = await request(app)
      .put(`${RUTA}/${ORDER_ID}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'INVENTADO' })

    // Assert
    expect(res.status).to.equal(400)
  })

  it('pedido inexistente → 404', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.order.findUnique.mockResolvedValue(null)

    // Act
    const res = await request(app)
      .put(`${RUTA}/${ORDER_ID}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'SHIPPED' })

    // Assert
    expect(res.status).to.equal(404)
  })

  it('transición válida → 200 con el estado nuevo', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.order.findUnique.mockResolvedValue(pedido())
    prismaMock.order.update.mockResolvedValue(pedido({ status: 'SHIPPED' }))

    // Act
    const res = await request(app)
      .put(`${RUTA}/${ORDER_ID}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'SHIPPED' })

    // Assert
    expect(res.status).to.equal(200)
    expect(res.body.data.status).to.equal('SHIPPED')
  })
})
