import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Dashboard } from '../../../src/pages/Dashboard'
import type { Order } from '../../../src/types/order'

// Funcionalidad 24 — Listar pedidos por usuario
// Basado en: Dashboard.tsx — useEffect() que llama ordersService.getMyOrders()

vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'ana@test.com', name: 'Ana Garcia', role: 'USER', createdAt: '' },
  }),
}))

vi.mock('../../../src/services/orders.service', () => ({
  ordersService: {
    getMyOrders: vi.fn(),
  },
}))

import { ordersService } from '../../../src/services/orders.service'

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    orderRef: 'CP-0001',
    userId: 'u1',
    email: 'ana@test.com',
    name: 'Ana Garcia',
    phone: '3001234567',
    address: 'Calle 123',
    city: 'Bogota',
    dept: 'Cundinamarca',
    subtotal: 1_000_000,
    shipping: 0,
    total: 1_000_000,
    status: 'CONFIRMED',
    items: [
      {
        id: 1,
        phoneId: 'p1',
        name: 'iPhone 15',
        heroImage: null,
        price: 1_000_000,
        qty: 1,
        colorId: 'black',
        colorName: 'Negro',
      },
    ],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Dashboard — listar pedidos del usuario autenticado', () => {
  // Camino 1,2,F — getMyOrders() todavía no resuelve
  it('muestra el indicador de carga mientras llegan los pedidos', () => {
    ;(ordersService.getMyOrders as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {}),
    )

    renderDashboard()

    expect(screen.getByText(/cargando pedidos/i)).toBeInTheDocument()
  })

  // Camino 1,3,4,F — getMyOrders() resuelve con pedidos propios
  it('lista únicamente los pedidos que devuelve getMyOrders()', async () => {
    ;(ordersService.getMyOrders as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeOrder({ id: 'order-1', orderRef: 'CP-0001' }),
      makeOrder({ id: 'order-2', orderRef: 'CP-0002', status: 'DELIVERED' }),
    ])

    renderDashboard()

    expect(await screen.findByText('CP-0001')).toBeInTheDocument()
    expect(screen.getByText('CP-0002')).toBeInTheDocument()
    expect(ordersService.getMyOrders).toHaveBeenCalledTimes(1)
  })

  // Camino 1,3,5,F — getMyOrders() resuelve vacío: el usuario no ha comprado
  it('muestra el estado vacío cuando el usuario no tiene pedidos', async () => {
    ;(ordersService.getMyOrders as ReturnType<typeof vi.fn>).mockResolvedValue([])

    renderDashboard()

    expect(
      await screen.findByText(/todavía no tienes pedidos/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver catálogo/i })).toBeInTheDocument()
  })

  // Regresión: un fallo de red no debe dejar la pantalla cargando para siempre
  it('cae al estado vacío en vez de quedarse cargando si getMyOrders() rechaza', async () => {
    ;(ordersService.getMyOrders as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('network error'),
    )

    renderDashboard()

    expect(
      await screen.findByText(/todavía no tienes pedidos/i),
    ).toBeInTheDocument()
  })
})
