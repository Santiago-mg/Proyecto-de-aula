import { expect } from 'chai'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { consultaDe, prismaMock } from '../helpers/prisma-mock'
import {
  alerta,
  autenticar,
  autenticarAdmin,
  bodyCelularValido,
  celular,
} from '../helpers/fixtures'

/**
 * ESC-31 — Alertas de stock
 *
 * Recorre la funcionalidad completa por HTTP: cómo se levanta una alerta
 * cuando una compra deja el inventario en el mínimo, cómo se cierra al
 * reponer desde el panel, y cómo el administrador las consulta.
 */

const ALERTAS = '/api/v1/admin/alerts'
const PEDIDOS = '/api/v1/orders'
const CELULARES = '/api/v1/phones'

const PHONE_ID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301'
const ORDER_ID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

function bodyPedido(qty = 1) {
  return {
    email: 'ana@test.com',
    name: 'Ana Garcia',
    phone: '+57 300 123 4567',
    address: 'Calle 123 #45-67',
    city: 'Bogota',
    dept: 'Cundinamarca',
    items: [{ phoneId: PHONE_ID, qty }],
  }
}

/**
 * Programa el doble para una compra que sí se completa.
 *
 * OrderRepository lee el catálogo dos veces dentro de la transacción: la
 * primera para cobrar el precio vigente, la segunda —ya con el stock
 * descontado— para decidir las alertas. Por eso van dos findMany encadenados.
 */
function programarCompra({
  stockAntes,
  stockDespues,
  minStock,
}: {
  stockAntes: number
  stockDespues: number
  minStock: number
}) {
  prismaMock.phone.findMany
    .mockResolvedValueOnce([
      {
        id: PHONE_ID,
        name: 'iPhone 13',
        price: 100_000,
        heroImage: null,
        stock: stockAntes,
      },
    ])
    .mockResolvedValueOnce([
      { id: PHONE_ID, name: 'iPhone 13', stock: stockDespues, minStock },
    ])

  prismaMock.order.create.mockResolvedValue({
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
  })

  prismaMock.phone.updateMany.mockResolvedValue({ count: 1 })
}

describe('GET /admin/alerts — consultar alertas abiertas', () => {
  it('sin token → 401', async () => {
    // Act
    const res = await request(app).get(ALERTAS)

    // Assert
    expect(res.status).to.equal(401)
  })

  it('usuario sin rol de administrador → 403', async () => {
    // Arrange
    const { token } = autenticar()

    // Act
    const res = await request(app)
      .get(ALERTAS)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(403)
    expect(prismaMock.alert.findMany.mock.calls).to.be.empty
  })

  it('sin alertas pendientes → 200 con lista vacía', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.alert.findMany.mockResolvedValue([])

    // Act
    const res = await request(app)
      .get(ALERTAS)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(200)
    expect(res.body.data).to.be.an('array').that.is.empty
  })

  it('devuelve las alertas con los datos del celular', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.alert.findMany.mockResolvedValue([
      alerta({
        phoneId: PHONE_ID,
        type: 'OUT_OF_STOCK',
        message: '"iPhone 13" se quedó sin unidades.',
        nombreCelular: 'iPhone 13',
        stock: 0,
        minStock: 5,
      }),
    ])

    // Act
    const res = await request(app)
      .get(ALERTAS)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(200)
    expect(res.body.data).to.have.lengthOf(1)
    const [alertaDevuelta] = res.body.data
    expect(alertaDevuelta).to.include({ type: 'OUT_OF_STOCK', phoneId: PHONE_ID })
    expect(alertaDevuelta.phone).to.include({ name: 'iPhone 13', stock: 0, minStock: 5 })
  })

  it('solo pide las que siguen sin resolver, de la más reciente a la más antigua', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.alert.findMany.mockResolvedValue([])

    // Act
    await request(app).get(ALERTAS).set('Authorization', `Bearer ${token}`)

    // Assert
    expect(consultaDe(prismaMock.alert.findMany)).to.deep.include({
      where: { isResolved: false },
      orderBy: { createdAt: 'desc' },
    })
  })
})

describe('Una compra levanta la alerta que corresponda', () => {
  it('si la compra deja el stock justo en el mínimo → alerta de poco stock', async () => {
    // Arrange
    const { token } = autenticar()
    programarCompra({ stockAntes: 6, stockDespues: 5, minStock: 5 })

    // Act
    const res = await request(app)
      .post(PEDIDOS)
      .set('Authorization', `Bearer ${token}`)
      .send(bodyPedido())

    // Assert
    expect(res.status).to.equal(201)
    expect(consultaDe(prismaMock.alert.upsert)).to.deep.include({
      where: { phoneId_type: { phoneId: PHONE_ID, type: 'LOW_STOCK' } },
    })
  })

  it('si la compra agota el celular → alerta de agotado', async () => {
    // Arrange
    const { token } = autenticar()
    programarCompra({ stockAntes: 1, stockDespues: 0, minStock: 5 })

    // Act
    const res = await request(app)
      .post(PEDIDOS)
      .set('Authorization', `Bearer ${token}`)
      .send(bodyPedido())

    // Assert
    expect(res.status).to.equal(201)
    expect(consultaDe(prismaMock.alert.upsert)).to.deep.include({
      where: { phoneId_type: { phoneId: PHONE_ID, type: 'OUT_OF_STOCK' } },
    })
  })

  it('si queda inventario de sobra → no abre ninguna alerta', async () => {
    // Arrange
    const { token } = autenticar()
    programarCompra({ stockAntes: 50, stockDespues: 49, minStock: 5 })

    // Act
    const res = await request(app)
      .post(PEDIDOS)
      .set('Authorization', `Bearer ${token}`)
      .send(bodyPedido())

    // Assert
    expect(res.status).to.equal(201)
    expect(prismaMock.alert.upsert.mock.calls).to.be.empty
    // Aun así cierra lo que hubiera quedado abierto de antes.
    expect(prismaMock.alert.updateMany.mock.calls).to.deep.include([{
      where: { phoneId: PHONE_ID, isResolved: false },
      data: { isResolved: true },
    }])
  })

  it('si el pedido se cae por stock insuficiente, no se toca la tabla de alertas', async () => {
    // Arrange
    const { token } = autenticar()
    prismaMock.phone.findMany.mockResolvedValue([
      {
        id: PHONE_ID,
        name: 'iPhone 13',
        price: 100_000,
        heroImage: null,
        stock: 1,
      },
    ])
    prismaMock.order.create.mockResolvedValue({ id: ORDER_ID, items: [] })
    // El descuento atómico no encuentra fila con stock suficiente.
    prismaMock.phone.updateMany.mockResolvedValue({ count: 0 })

    // Act
    const res = await request(app)
      .post(PEDIDOS)
      .set('Authorization', `Bearer ${token}`)
      .send(bodyPedido(5))

    // Assert
    expect(res.status).to.equal(400)
    expect(prismaMock.alert.upsert.mock.calls).to.be.empty
    expect(prismaMock.alert.updateMany.mock.calls).to.be.empty
  })
})

describe('Reponer inventario desde el panel cierra la alerta', () => {
  it('al subir el stock por encima del mínimo se resuelven las abiertas', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const existente = celular({ id: PHONE_ID, stock: 0, minStock: 5 })
    prismaMock.phone.findUnique.mockResolvedValue(existente)
    prismaMock.phone.update.mockResolvedValue({
      ...existente,
      stock: 30,
    })

    // Act
    const res = await request(app)
      .put(`${CELULARES}/${PHONE_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stock: 30 })

    // Assert
    expect(res.status).to.equal(200)
    expect(prismaMock.alert.updateMany.mock.calls).to.deep.include([{
      where: { phoneId: PHONE_ID, isResolved: false },
      data: { isResolved: true },
    }])
    expect(prismaMock.alert.upsert.mock.calls).to.be.empty
  })

  it('si se repone poco, la alerta sigue abierta pero como LOW_STOCK', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const existente = celular({ id: PHONE_ID, stock: 0, minStock: 5 })
    prismaMock.phone.findUnique.mockResolvedValue(existente)
    prismaMock.phone.update.mockResolvedValue({ ...existente, stock: 2 })

    // Act
    await request(app)
      .put(`${CELULARES}/${PHONE_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stock: 2 })

    // Assert
    expect(consultaDe(prismaMock.alert.upsert)).to.deep.include({
      where: { phoneId_type: { phoneId: PHONE_ID, type: 'LOW_STOCK' } },
    })
  })

  it('un celular nuevo dado de alta sin unidades nace con su alerta', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.phone.findUnique.mockResolvedValue(null)
    prismaMock.phone.create.mockResolvedValue(
      celular({ id: PHONE_ID, stock: 0, minStock: 5 }),
    )

    // Act
    const res = await request(app)
      .post(CELULARES)
      .set('Authorization', `Bearer ${token}`)
      .send(bodyCelularValido({ stock: 0, minStock: 5 }))

    // Assert
    expect(res.status).to.equal(201)
    expect(consultaDe(prismaMock.alert.upsert)).to.deep.include({
      where: { phoneId_type: { phoneId: PHONE_ID, type: 'OUT_OF_STOCK' } },
    })
  })
})

describe('minStock en el catálogo', () => {
  it('si no se envía, el celular se crea con el mínimo por defecto (5)', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.phone.findUnique.mockResolvedValue(null)
    prismaMock.phone.create.mockResolvedValue(celular({ id: PHONE_ID }))

    // Act
    await request(app)
      .post(CELULARES)
      .set('Authorization', `Bearer ${token}`)
      .send(bodyCelularValido())

    // Assert
    expect(consultaDe(prismaMock.phone.create).data).to.include({ minStock: 5 })
  })

  it('un mínimo negativo se rechaza con 400', async () => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    const res = await request(app)
      .post(CELULARES)
      .set('Authorization', `Bearer ${token}`)
      .send(bodyCelularValido({ minStock: -1 }))

    // Assert
    expect(res.status).to.equal(400)
    expect(res.body.error).to.equal('Datos inválidos')
    expect(prismaMock.phone.create.mock.calls).to.be.empty
  })
})

describe('Fallos de infraestructura al consultar alertas', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('si la consulta se cae → 500', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.alert.findMany.mockRejectedValue(new Error('timeout'))

    // Act
    const res = await request(app)
      .get(ALERTAS)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(500)
  })
})
