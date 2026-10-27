import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminOrders } from '../../../src/pages/admin/AdminOrders'
import type { Order } from '../../../src/types/order'

// Funcionalidad 23 — Listar todos los pedidos (admin)
// Funcionalidad 25 — Actualizar estado de una orden
// Basado en: AdminOrders.tsx — load() + adminService.getAllOrders()/updateOrderStatus()

vi.mock('../../../src/services/admin.service', () => ({
  adminService: {
    getAllOrders: vi.fn(),
    updateOrderStatus: vi.fn(),
  },
}))

vi.mock('../../../src/context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

import { adminService } from '../../../src/services/admin.service'

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
    status: 'PENDING',
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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AdminOrders — listar todos los pedidos', () => {
  // Camino 1,2,F — getAllOrders(page) resuelve con la lista paginada completa
  it('lista todas las órdenes que devuelve getAllOrders(), sin filtrar por usuario', async () => {
    ;(adminService.getAllOrders as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        makeOrder({ id: 'order-1', orderRef: 'CP-0001', email: 'ana@test.com' }),
        makeOrder({ id: 'order-2', orderRef: 'CP-0002', email: 'luis@test.com' }),
      ],
      meta: { total: 2, page: 1, totalPages: 1 },
    })

    render(<AdminOrders />)

    expect(await screen.findByText('CP-0001')).toBeInTheDocument()
    expect(screen.getByText('CP-0002')).toBeInTheDocument()
    expect(screen.getByText('2 órdenes totales')).toBeInTheDocument()
    expect(adminService.getAllOrders).toHaveBeenCalledWith(1)
  })
})

describe('AdminOrders — actualizar estado de una orden', () => {
  // Camino 1,2,3,4,F — el admin cambia el estado y updateOrderStatus() resuelve
  it('llama a updateOrderStatus(id, status) y refleja el nuevo estado en la fila', async () => {
    ;(adminService.getAllOrders as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [makeOrder({ status: 'PENDING' })],
      meta: { total: 1, page: 1, totalPages: 1 },
    })
    ;(adminService.updateOrderStatus as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeOrder({ status: 'CONFIRMED' }),
    )

    const user = userEvent.setup()
    render(<AdminOrders />)

    await screen.findByText('CP-0001')
    await user.selectOptions(screen.getByRole('combobox'), 'CONFIRMED')

    await waitFor(() => {
      expect(adminService.updateOrderStatus).toHaveBeenCalledWith('order-1', 'CONFIRMED')
    })
    const row = screen.getByText('CP-0001').closest('tr')!
    await waitFor(() => {
      expect(row.querySelector('.cp-badge')?.textContent).toBe('Confirmado')
    })
  })

  // El selector debe deshabilitarse mientras se guarda el cambio, para no
  // disparar dos actualizaciones sobre la misma orden.
  it('deshabilita el selector de estado mientras la actualización está en curso', async () => {
    ;(adminService.getAllOrders as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [makeOrder({ status: 'PENDING' })],
      meta: { total: 1, page: 1, totalPages: 1 },
    })
    let resolveUpdate: (v: Order) => void = () => {}
    ;(adminService.updateOrderStatus as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve
      }),
    )

    const user = userEvent.setup()
    render(<AdminOrders />)
    await screen.findByText('CP-0001')

    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'CONFIRMED')

    expect(select).toBeDisabled()
    resolveUpdate(makeOrder({ status: 'CONFIRMED' }))
  })

  // Regresión: si updateOrderStatus() rechaza, la orden no debe quedar
  // marcada con un estado que el backend nunca confirmó.
  it('conserva el estado anterior si updateOrderStatus() rechaza', async () => {
    ;(adminService.getAllOrders as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [makeOrder({ status: 'PENDING' })],
      meta: { total: 1, page: 1, totalPages: 1 },
    })
    ;(adminService.updateOrderStatus as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('network error'),
    )

    const user = userEvent.setup()
    render(<AdminOrders />)
    await screen.findByText('CP-0001')

    await user.selectOptions(screen.getByRole('combobox'), 'CONFIRMED').catch(() => {})

    const row = screen.getByText('CP-0001').closest('tr')!
    await waitFor(() => {
      expect(row.querySelector('.cp-badge')?.textContent).toBe('Pendiente')
    })
  })
})
