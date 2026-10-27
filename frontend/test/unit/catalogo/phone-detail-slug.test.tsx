import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { PhoneDetail } from '../../../src/pages/PhoneDetail'
import type { Phone } from '../../../src/types/phone'

// Funcionalidad 31 — Buscar celular por slug
// Basado en: PhoneDetail.tsx — useEffect() que llama phonesService.getBySlug(slug)

vi.mock('../../../src/services/phones.service', () => ({
  phonesService: {
    getBySlug: vi.fn(),
    getSimilar: vi.fn(),
  },
}))

vi.mock('../../../src/context/CartContext', () => ({
  useCart: () => ({ addToCart: vi.fn() }),
}))

vi.mock('../../../src/context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

import { phonesService } from '../../../src/services/phones.service'

function makePhone(overrides: Partial<Phone> = {}): Phone {
  return {
    id: 'p1',
    slug: 'iphone-15',
    name: 'iPhone 15',
    brand: 'Apple',
    categoryId: 'apple',
    price: 4_500_000,
    compareAt: null,
    badge: null,
    stock: 5,
    condition: 'NEW',
    verified: true,
    batteryHealth: null,
    storage: '128GB',
    ram: '6GB',
    shortDesc: 'Descripción corta',
    heroImage: null,
    category: 'apple',
    camera: null,
    battery: null,
    screen: null,
    chip: null,
    longDesc: null,
    images: [],
    colors: [],
    features: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

function renderAtSlug(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/phones/${slug}`]}>
      <Routes>
        <Route path="/phones/:slug" element={<PhoneDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(phonesService.getSimilar as ReturnType<typeof vi.fn>).mockResolvedValue([])
})

describe('PhoneDetail — buscar celular por slug', () => {
  // Camino 1,2,F — getBySlug(slug) resuelve con el celular
  it('pide el celular exacto que trae la URL y lo muestra', async () => {
    ;(phonesService.getBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(
      makePhone({ slug: 'iphone-15', name: 'iPhone 15' }),
    )

    renderAtSlug('iphone-15')

    expect(
      await screen.findByRole('heading', { name: 'iPhone 15' }),
    ).toBeInTheDocument()
    expect(phonesService.getBySlug).toHaveBeenCalledTimes(1)
    expect(phonesService.getBySlug).toHaveBeenCalledWith('iphone-15')
  })

  // Camino 1,3,F — getBySlug(slug) rechaza (404 del backend)
  it('muestra "Celular no encontrado" cuando el slug no existe', async () => {
    ;(phonesService.getBySlug as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('404'),
    )

    renderAtSlug('slug-inexistente')

    expect(
      await screen.findByText(/celular no encontrado/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /volver al catálogo/i }),
    ).toBeInTheDocument()
  })

  // Un cambio de slug debe volver a consultar, no reusar el resultado anterior
  it('vuelve a pedir el celular cuando el slug de la URL cambia', async () => {
    ;(phonesService.getBySlug as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makePhone({ slug: 'iphone-15', name: 'iPhone 15' }))
      .mockResolvedValueOnce(makePhone({ slug: 'galaxy-s24', name: 'Galaxy S24' }))

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/phones/iphone-15']}>
        <Routes>
          <Route path="/phones/:slug" element={<PhoneDetail />} />
        </Routes>
        {/* Simula la navegación cliente-a-cliente entre dos fichas de producto
            (p.ej. desde "también te puede interesar"), sin recargar la página. */}
        <Link to="/phones/galaxy-s24">ir a galaxy-s24</Link>
      </MemoryRouter>,
    )
    await screen.findByRole('heading', { name: 'iPhone 15' })

    await user.click(screen.getByRole('link', { name: 'ir a galaxy-s24' }))

    expect(
      await screen.findByRole('heading', { name: 'Galaxy S24' }),
    ).toBeInTheDocument()
    expect(phonesService.getBySlug).toHaveBeenCalledTimes(2)
    expect(phonesService.getBySlug).toHaveBeenNthCalledWith(2, 'galaxy-s24')
  })
})
