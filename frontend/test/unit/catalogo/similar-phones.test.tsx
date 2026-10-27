import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PhoneDetail } from '../../../src/pages/PhoneDetail'
import type { Phone, PhoneListItem } from '../../../src/types/phone'

// Funcionalidad 13 — Recomendación de productos
// Basado en: PhoneDetail.tsx — useEffect() que llama phonesService.getSimilar(slug)
// y renderiza la sección "También te puede interesar" con PhoneCard.

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
    id: 'base-id',
    slug: 'iphone-15-pro',
    name: 'iPhone 15 Pro',
    brand: 'Apple',
    categoryId: 'apple',
    price: 5_500_000,
    compareAt: null,
    badge: null,
    stock: 5,
    condition: 'NEW',
    verified: true,
    batteryHealth: null,
    storage: '256GB',
    ram: '8GB',
    shortDesc: null,
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

function makeListItem(overrides: Partial<PhoneListItem> = {}): PhoneListItem {
  return {
    id: 'similar-1',
    slug: 'iphone-14',
    name: 'iPhone 14',
    brand: 'Apple',
    price: 3_800_000,
    compareAt: null,
    badge: null,
    stock: 4,
    condition: 'CERTIFIED',
    verified: true,
    batteryHealth: 92,
    storage: '128GB',
    ram: '6GB',
    shortDesc: null,
    heroImage: null,
    category: 'apple',
    ...overrides,
  }
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/phones/iphone-15-pro']}>
      <Routes>
        <Route path="/phones/:slug" element={<PhoneDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(phonesService.getBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(makePhone())
})

describe('PhoneDetail — recomendación de productos', () => {
  // Camino 1,2,F — getSimilar(slug) resuelve con candidatos
  it('pide recomendaciones para el slug actual y las muestra', async () => {
    ;(phonesService.getSimilar as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeListItem({ id: 's1', slug: 'iphone-14', name: 'iPhone 14' }),
      makeListItem({ id: 's2', slug: 'iphone-13', name: 'iPhone 13' }),
    ])

    renderDetail()

    const seccion = await screen.findByTestId('similar-phones')
    expect(within(seccion).getByText('iPhone 14')).toBeInTheDocument()
    expect(within(seccion).getByText('iPhone 13')).toBeInTheDocument()
    expect(phonesService.getSimilar).toHaveBeenCalledWith('iphone-15-pro')
  })

  // Camino 1,3,F — getSimilar(slug) resuelve vacío: no hay nada parecido
  it('no muestra la sección de recomendaciones cuando no hay celulares similares', async () => {
    ;(phonesService.getSimilar as ReturnType<typeof vi.fn>).mockResolvedValue([])

    renderDetail()

    await screen.findByRole('heading', { name: 'iPhone 15 Pro' })
    expect(screen.queryByTestId('similar-phones')).not.toBeInTheDocument()
    expect(
      screen.queryByText(/también te puede interesar/i),
    ).not.toBeInTheDocument()
  })

  // Regresión: un fallo en /similares no debe romper la ficha del producto
  it('sigue mostrando la ficha del producto si getSimilar() rechaza', async () => {
    ;(phonesService.getSimilar as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('network error'),
    )

    renderDetail()

    expect(
      await screen.findByRole('heading', { name: 'iPhone 15 Pro' }),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('similar-phones')).not.toBeInTheDocument()
  })
})
