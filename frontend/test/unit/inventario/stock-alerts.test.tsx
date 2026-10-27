import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AdminDashboard } from '../../../src/pages/admin/AdminDashboard'
import type { AdminStats, StockAlert } from '../../../src/types/admin'

// Funcionalidad 14 — Alertas de stock bajo
// Basado en: AdminDashboard.tsx — useEffect() que llama adminService.getAlerts()
// y renderiza el panel "Alertas de inventario".

vi.mock('../../../src/services/admin.service', () => ({
  adminService: {
    getStats: vi.fn(),
    getAlerts: vi.fn(),
  },
}))

import { adminService } from '../../../src/services/admin.service'

function makeStats(overrides: Partial<AdminStats> = {}): AdminStats {
  return {
    users: { total: 10, banned: 0, newThisWeek: 1, admins: 1 },
    phones: { total: 20, inStock: 18, outOfStock: 2, verified: 15 },
    orders: {
      total: 5,
      pending: 1,
      confirmed: 1,
      shipped: 1,
      delivered: 2,
      cancelled: 0,
      revenue: 1_000_000,
      revenueThisMonth: 200_000,
    },
    revenueByDay: [],
    recentOrders: [],
    ...overrides,
  }
}

function makeAlert(overrides: Partial<StockAlert> = {}): StockAlert {
  return {
    id: 'alert-1',
    phoneId: 'phone-1',
    type: 'LOW_STOCK',
    message: '"iPhone 13" tiene 2 unidades, en o por debajo del mínimo de 5.',
    isResolved: false,
    createdAt: '2026-09-20T00:00:00.000Z',
    phone: {
      id: 'phone-1',
      name: 'iPhone 13',
      slug: 'iphone-13',
      stock: 2,
      minStock: 5,
      heroImage: null,
    },
    ...overrides,
  }
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(adminService.getStats as ReturnType<typeof vi.fn>).mockResolvedValue(makeStats())
})

describe('AdminDashboard — alertas de stock bajo', () => {
  // Camino 1,2,F — getAlerts() resuelve con alertas activas
  it('notifica al administrador cuando hay alertas de inventario abiertas', async () => {
    ;(adminService.getAlerts as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeAlert(),
      makeAlert({ id: 'alert-2', type: 'OUT_OF_STOCK', message: '"Galaxy S24" se quedó sin unidades.' }),
    ])

    renderDashboard()

    const panel = await screen.findByTestId('stock-alerts')
    expect(within(panel).getByText(/alertas de inventario \(2\)/i)).toBeInTheDocument()
    expect(
      within(panel).getByText(/iPhone 13.*tiene 2 unidades/i),
    ).toBeInTheDocument()
    expect(within(panel).getByText(/sin stock/i)).toBeInTheDocument()
    expect(within(panel).getByText(/stock bajo/i)).toBeInTheDocument()
  })

  // Camino 1,3,F — getAlerts() resuelve vacío: el inventario está sano
  it('no muestra el panel de alertas cuando no hay ninguna abierta', async () => {
    ;(adminService.getAlerts as ReturnType<typeof vi.fn>).mockResolvedValue([])

    renderDashboard()

    await screen.findByText('Panel')
    expect(screen.queryByTestId('stock-alerts')).not.toBeInTheDocument()
  })

  // Regresión: un fallo en /admin/alerts no debe tumbar el resto del dashboard
  it('el dashboard se sigue viendo con normalidad si getAlerts() rechaza', async () => {
    ;(adminService.getAlerts as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('network error'),
    )

    renderDashboard()

    expect(await screen.findByText('Panel')).toBeInTheDocument()
    expect(screen.queryByTestId('stock-alerts')).not.toBeInTheDocument()
  })
})
