import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Checkout } from '../../../src/pages/Checkout'
import type { CartItem, Order } from '../../../src/types/order'

// Funcionalidad 22 — Crear orden
// Basado en: Checkout.tsx — onSubmit() + ordersService.create()

const useCartMock = vi.fn()
const useAuthMock = vi.fn()
const navigateMock = vi.fn()

vi.mock('../../../src/context/CartContext', () => ({
  useCart: () => useCartMock(),
}))
vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('../../../src/services/orders.service', () => ({
  ordersService: {
    create: vi.fn(),
  },
}))

import { ordersService } from '../../../src/services/orders.service'

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    key: 'p1-black',
    phoneId: 'p1',
    name: 'iPhone 15',
    heroImage: null,
    price: 1_000_000,
    qty: 1,
    colorId: 'black',
    colorName: 'Negro',
    ...overrides,
  }
}

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    orderRef: 'CP-0001',
    userId: null,
    email: 'ana@test.com',
    name: 'Ana Garcia',
    phone: '+57 300 123 4567',
    address: 'Calle 123 #45-67',
    city: 'Bogota',
    dept: 'Cundinamarca',
    subtotal: 1_000_000,
    shipping: 0,
    total: 1_000_000,
    status: 'PENDING',
    items: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

function fillForm(user: ReturnType<typeof userEvent.setup>) {
  return (async () => {
    await user.type(screen.getByLabelText(/nombre completo/i), 'Ana Garcia')
    await user.type(screen.getByLabelText(/^email$/i), 'ana@test.com')
    await user.type(screen.getByLabelText(/teléfono/i), '3001234567')
    await user.type(screen.getByLabelText(/dirección/i), 'Calle 123 #45-67')
    await user.type(screen.getByLabelText(/ciudad/i), 'Bogota')
    await user.type(screen.getByLabelText(/departamento/i), 'Cundinamarca')
  })()
}

function renderCheckout() {
  return render(
    <MemoryRouter initialEntries={['/checkout']}>
      <Routes>
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/catalog" element={<p>Catálogo</p>} />
        <Route path="/dashboard" element={<p>Dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthMock.mockReturnValue({ user: null })
})

describe('Checkout — crear orden', () => {
  // Camino 1,F — el carrito está vacío: no hay nada que pedir
  it('redirige a /catalog si el carrito está vacío', () => {
    useCartMock.mockReturnValue({ cart: [], clearCart: vi.fn() })

    renderCheckout()

    expect(screen.getByText('Catálogo')).toBeInTheDocument()
  })

  // Camino 2,3,4,5,F — datos válidos, ordersService.create() resuelve
  it('crea la orden con los items del carrito y navega al dashboard con la referencia', async () => {
    const clearCartMock = vi.fn()
    useCartMock.mockReturnValue({ cart: [makeCartItem()], clearCart: clearCartMock })
    ;(ordersService.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeOrder({ orderRef: 'CP-0042' }),
    )

    const user = userEvent.setup()
    renderCheckout()
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /confirmar pedido/i }))

    await waitFor(() => {
      expect(ordersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'ana@test.com', name: 'Ana Garcia' }),
        [makeCartItem()],
      )
    })
    await waitFor(() => {
      expect(clearCartMock).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard?order=CP-0042')
    })
  })

  // Camino 2,3,4,6,F — ordersService.create() rechaza (p.ej. stock agotado entre carrito y pago)
  it('muestra un error y permanece en /checkout cuando ordersService.create() rechaza', async () => {
    const clearCartMock = vi.fn()
    useCartMock.mockReturnValue({ cart: [makeCartItem()], clearCart: clearCartMock })
    ;(ordersService.create as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Stock insuficiente'),
    )

    const user = userEvent.setup()
    renderCheckout()
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /confirmar pedido/i }))

    expect(await screen.findByText(/stock insuficiente/i)).toBeInTheDocument()
    expect(clearCartMock).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  // Camino 2,3,7,F — el formulario no pasa el schema: no se llama al servicio
  it('no llama a ordersService.create() si el email no es válido', async () => {
    useCartMock.mockReturnValue({ cart: [makeCartItem()], clearCart: vi.fn() })

    const user = userEvent.setup()
    renderCheckout()
    await user.type(screen.getByLabelText(/^email$/i), 'correo-invalido')
    await user.click(screen.getByRole('button', { name: /confirmar pedido/i }))

    expect(await screen.findByText('Email inválido')).toBeInTheDocument()
    expect(ordersService.create).not.toHaveBeenCalled()
  })
})
