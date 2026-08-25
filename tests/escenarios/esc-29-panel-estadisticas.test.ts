import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { prismaMock } from '../helpers/prisma-mock'
import {
  ID_USUARIO,
  autenticarComo,
  simularEstadisticas,
  tokenConFirmaInvalida,
} from '../helpers/datos'

/**
 * ESC-29 — Panel de estadísticas
 * GET /api/v1/admin/stats
 *
 * V(G) = 6. Los tres últimos caminos recorren el bucle que suma los ingresos:
 * sin pedidos, con un pedido que sí suma, y con un pedido cancelado que se salta.
 */

const RUTA = '/api/v1/admin/stats'

/** Una fila del groupBy de pedidos, tal como la devuelve Prisma. */
function grupoDePedidos(status: string, cantidad: number, suma: number) {
  return { status, _count: { _all: cantidad }, _sum: { total: suma } }
}

// Cada prueba arranca con los mocks en blanco, así ninguna pasa "de rebote"
// por lo que dejó configurado la anterior.
beforeEach(() => {
  vi.resetAllMocks()
})

describe('ESC-29 — Panel de estadísticas', () => {
  it('Camino 1 (1-2-14): sin cabecera Bearer → 401 Token requerido', async () => {
    const res = await request(app).get(RUTA)

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token requerido')
    expect(prismaMock.order.groupBy).not.toHaveBeenCalled()
  })

  it('Camino 2 (1-3-4-14): firma inválida → 401 Token inválido o expirado', async () => {
    const res = await request(app)
      .get(RUTA)
      .set('Authorization', `Bearer ${tokenConFirmaInvalida()}`)

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token inválido o expirado')
    expect(prismaMock.order.groupBy).not.toHaveBeenCalled()
  })

  it('Camino 3 (1-3-5-6-14): rol USER → 403 Acceso restringido', async () => {
    const token = autenticarComo({ id: ID_USUARIO, role: 'USER' })

    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Acceso restringido a administradores')
    expect(prismaMock.order.groupBy).not.toHaveBeenCalled()
  })

  it('Camino 4 (1-3-5-7-8-9-13-14): sin pedidos → 200 con los ingresos en 0', async () => {
    const token = autenticarComo()
    simularEstadisticas({ groupBy: [] })

    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.orders).toMatchObject({ total: 0, revenue: 0 })
  })

  it('Camino 5 (1-3-5-7-8-9-10-11-9-13-14): pedido no cancelado → suma su total a los ingresos', async () => {
    const token = autenticarComo()
    simularEstadisticas({ groupBy: [grupoDePedidos('DELIVERED', 1, 3_500_000)] })

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
    const token = autenticarComo()
    simularEstadisticas({ groupBy: [grupoDePedidos('CANCELLED', 1, 3_500_000)] })

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
    const token = autenticarComo()
    simularEstadisticas({
      groupBy: [
        grupoDePedidos('DELIVERED', 2, 5_000_000),
        grupoDePedidos('PENDING', 1, 1_000_000),
        grupoDePedidos('CANCELLED', 3, 9_000_000),
      ],
    })

    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.orders).toMatchObject({
      total: 6,
      delivered: 2,
      pending: 1,
      cancelled: 3,
      revenue: 6_000_000, // 5.000.000 + 1.000.000, sin los 9.000.000 cancelados
    })
  })

  it('El panel siempre devuelve los 7 días de ingresos', async () => {
    const token = autenticarComo()
    simularEstadisticas({ groupBy: [] })

    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.revenueByDay).toHaveLength(7)
  })
})
