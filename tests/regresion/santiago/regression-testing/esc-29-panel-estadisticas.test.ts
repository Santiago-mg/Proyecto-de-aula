import { expect } from 'chai'
import { afterEach, describe, it, vi } from 'vitest'
import { prismaMock } from '../../../helpers/prisma-mock'
import { AdminRepository } from '../../../../src/infrastructure/repositories/AdminRepository'
import { pedidoReciente, programarEstadisticas } from '../helpers/estadisticas'

/**
 * ESC-29 — Panel de estadísticas · regression-testing
 *
 * Las cuentas del panel: qué suma a los ingresos, desde cuándo cuenta "este
 * mes" y en qué día cae cada venta.
 *
 * FIRST — Repeatable: el ejercicio 2 del curso plantea una prueba que
 * "depende de la fecha actual y falla el primer día del mes". Este panel
 * calcula el inicio del mes y los últimos 7 días con la fecha del sistema, así
 * que las pruebas que dependen de eso fijan el reloj con vi.setSystemTime en
 * vez de usar el día en que se corran.
 */

const DIA = 24 * 60 * 60 * 1000

function fijarFecha(fecha: Date) {
  // Solo se falsea Date: los temporizadores siguen siendo los reales.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(fecha)
}

afterEach(() => {
  vi.useRealTimers()
})

describe('ESC-29 · Regresión — panel de estadísticas', () => {
  describe('Ingresos', () => {
    it('solo suman los pedidos que no están cancelados', async () => {
      // Arrange
      programarEstadisticas({
        pedidos: [
          { status: 'DELIVERED', count: 2, sum: 5_000_000 },
          { status: 'PENDING', count: 1, sum: 1_000_000 },
          { status: 'SHIPPED', count: 1, sum: 2_000_000 },
          { status: 'CANCELLED', count: 3, sum: 9_000_000 },
        ],
      })

      // Act
      const { orders } = await new AdminRepository().getStats()

      // Assert
      expect(orders).to.include({ total: 7, cancelled: 3, revenue: 8_000_000 })
    })

    it('un estado sin pedidos se muestra en 0, no queda undefined', async () => {
      // Arrange
      programarEstadisticas({ pedidos: [{ status: 'PENDING', count: 4, sum: 400_000 }] })

      // Act
      const { orders } = await new AdminRepository().getStats()

      // Assert
      expect(orders).to.deep.include({ pending: 4, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0 })
    })

    it('los ingresos del mes también excluyen los cancelados', async () => {
      // Arrange
      programarEstadisticas({ ingresosDelMes: 750_000 })

      // Act
      const { orders } = await new AdminRepository().getStats()

      // Assert
      expect(orders.revenueThisMonth).to.equal(750_000)
      const consulta = prismaMock.order.aggregate.mock.lastCall?.[0] as { where: { status: unknown } }
      expect(consulta.where.status).to.deep.equal({ not: 'CANCELLED' })
    })
  })

  describe('Inicio del mes (FIRST: Repeatable)', () => {
    it.each([
      ['1 de octubre a las 00:00:01', new Date(2026, 9, 1, 0, 0, 1)],
      ['1 de octubre a las 08:30', new Date(2026, 9, 1, 8, 30)],
      ['31 de octubre a las 23:59', new Date(2026, 9, 31, 23, 59)],
    ])('el %s, "este mes" empieza el 1 de octubre a las 00:00', async (_fecha, ahora) => {
      // Arrange
      fijarFecha(ahora)
      programarEstadisticas()

      // Act
      await new AdminRepository().getStats()

      // Assert
      const consulta = prismaMock.order.aggregate.mock.lastCall?.[0] as { where: { createdAt: { gte: Date } } }
      expect(consulta.where.createdAt.gte.getTime()).to.equal(new Date(2026, 9, 1, 0, 0, 0).getTime())
    })
  })

  describe('Ingresos por día', () => {
    it('una venta de hoy cae en el último día y una de hace 6 días en el primero', async () => {
      // Arrange
      fijarFecha(new Date(2026, 9, 10, 15, 0))
      programarEstadisticas({
        ultimos7Dias: [
          { total: 100_000, createdAt: new Date(2026, 9, 10, 9, 0) }, // hoy
          { total: 300_000, createdAt: new Date(2026, 9, 4, 18, 0) }, // hace 6 días
        ],
      })

      // Act
      const { revenueByDay } = await new AdminRepository().getStats()

      // Assert
      expect(revenueByDay[6]).to.include({ amount: 100_000, count: 1 })
      expect(revenueByDay[0]).to.include({ amount: 300_000, count: 1 })
      expect(revenueByDay.slice(1, 6).every((dia) => dia.count === 0)).to.equal(true)
    })

    it('dos ventas del mismo día se suman y se cuentan juntas', async () => {
      // Arrange
      fijarFecha(new Date(2026, 9, 10, 15, 0))
      programarEstadisticas({
        ultimos7Dias: [
          { total: 100_000, createdAt: new Date(2026, 9, 8, 9, 0) },
          { total: 250_000, createdAt: new Date(2026, 9, 8, 21, 30) },
        ],
      })

      // Act
      const { revenueByDay } = await new AdminRepository().getStats()

      // Assert
      expect(revenueByDay[4]).to.include({ amount: 350_000, count: 2 })
    })

    it('la consulta de la semana arranca 7 días atrás y excluye cancelados', async () => {
      // Arrange
      const ahora = new Date(2026, 9, 10, 15, 0)
      fijarFecha(ahora)
      programarEstadisticas()

      // Act
      await new AdminRepository().getStats()

      // Assert
      const consulta = prismaMock.order.findMany.mock.calls[1][0] as {
        where: { createdAt: { gte: Date }; status: unknown }
      }
      expect(consulta.where.createdAt.gte.getTime()).to.equal(ahora.getTime() - 7 * DIA)
      expect(consulta.where.status).to.deep.equal({ not: 'CANCELLED' })
    })
  })

  describe('Inventario y pedidos recientes', () => {
    it('los agotados se calculan como total menos los que tienen stock', async () => {
      // Arrange
      programarEstadisticas({ celulares: { total: 40, conStock: 31, verificados: 25 } })

      // Act
      const { phones } = await new AdminRepository().getStats()

      // Assert
      expect(phones).to.deep.equal({ total: 40, inStock: 31, outOfStock: 9, verified: 25 })
    })

    it('trae como mucho 8 pedidos recientes, del más nuevo al más viejo, con su número de artículos', async () => {
      // Arrange
      programarEstadisticas({ recientes: [pedidoReciente({ _count: { items: 5 } })] })

      // Act
      const { recentOrders } = await new AdminRepository().getStats()

      // Assert
      expect(recentOrders[0].itemCount).to.equal(5)
      expect(prismaMock.order.findMany.mock.calls[0][0]).to.deep.include({
        take: 8,
        orderBy: { createdAt: 'desc' },
      })
    })
  })
})
