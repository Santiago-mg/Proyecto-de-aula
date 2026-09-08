import { beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import prisma from '../../src/infrastructure/database/prisma'
import { limpiarBaseDeDatos } from '../helpers/db'
import { crearAdminAutenticado, crearUsuarioAutenticado, tokenConFirmaInvalida } from '../helpers/fixtures'

/**
 * ESC-29 — Panel de estadísticas
 * GET /api/v1/admin/stats
 *
 * V(G) = 6. Los tres últimos caminos recorren el bucle que suma los ingresos:
 * sin pedidos, con un pedido que sí suma, y con un pedido cancelado que se
 * salta. Contra Postgres real, sin mocks.
 *
 * getStats() solo lee: no hay ningún endpoint que lleve un pedido hasta
 * DELIVERED o CANCELLED de un salto (eso pasa con varias llamadas a
 * updateOrderStatus). Para probar el conteo por estado alcanza con insertar
 * el pedido directamente con el estado ya puesto, así que se hace con Prisma
 * en lugar de recorrer todo el flujo de compra.
 */

const RUTA = '/api/v1/admin/stats'

function crearPedido(overrides: {
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  total: number
  orderRef?: string
  createdAt?: Date
}) {
  const { status, total, orderRef, createdAt } = overrides
  return prisma.order.create({
    data: {
      orderRef: orderRef ?? `CP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      email: 'cliente@correo.com',
      name: 'Cliente de prueba',
      phone: '+57 300 000 0000',
      address: 'Calle de prueba',
      city: 'Bogota',
      dept: 'Cundinamarca',
      subtotal: total,
      shipping: 0,
      total,
      status,
      createdAt,
    },
  })
}

beforeEach(async () => {
  await limpiarBaseDeDatos()
})

describe('ESC-29 — Panel de estadísticas', () => {
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

  it('Camino 4 (1-3-5-7-8-9-13-14): sin pedidos → 200 con los ingresos en 0', async () => {
    const { token } = await crearAdminAutenticado()

    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.orders).toMatchObject({ total: 0, revenue: 0 })
  })

  it('Camino 5 (1-3-5-7-8-9-10-11-9-13-14): pedido no cancelado → suma su total a los ingresos', async () => {
    const { token } = await crearAdminAutenticado()
    await crearPedido({ status: 'DELIVERED', total: 3_500_000 })

    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.orders).toMatchObject({
      total: 1,
      delivered: 1,
      cancelled: 0,
      revenue: 3_500_000,
    })
  })

  it('Camino 6 (1-3-5-7-8-9-10-12-9-13-14): pedido cancelado → no se suma a los ingresos', async () => {
    const { token } = await crearAdminAutenticado()
    await crearPedido({ status: 'CANCELLED', total: 3_500_000 })

    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.orders).toMatchObject({
      total: 1,
      cancelled: 1,
      // El pedido se cuenta, pero su dinero no entra a los ingresos.
      revenue: 0,
    })
  })

  it('Con pedidos mezclados solo suma los que no están cancelados', async () => {
    const { token } = await crearAdminAutenticado()
    await crearPedido({ status: 'DELIVERED', total: 2_000_000 })
    await crearPedido({ status: 'DELIVERED', total: 3_000_000 })
    await crearPedido({ status: 'PENDING', total: 1_000_000 })
    await crearPedido({ status: 'CANCELLED', total: 3_000_000 })
    await crearPedido({ status: 'CANCELLED', total: 3_000_000 })
    await crearPedido({ status: 'CANCELLED', total: 3_000_000 })

    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.orders).toMatchObject({
      total: 6,
      delivered: 2,
      pending: 1,
      cancelled: 3,
      revenue: 6_000_000, // 2.000.000 + 3.000.000 + 1.000.000, sin los 9.000.000 cancelados
    })
  })

  it('El panel siempre devuelve los 7 días de ingresos', async () => {
    const { token } = await crearAdminAutenticado()

    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.revenueByDay).toHaveLength(7)
  })
})
