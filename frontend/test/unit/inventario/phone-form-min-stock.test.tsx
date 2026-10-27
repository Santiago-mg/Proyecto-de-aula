import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PhoneForm } from '../../../src/pages/admin/PhoneForm'
import { phonesService } from '../../../src/services/phones.service'
import type { Phone } from '../../../src/types/phone'

// Alerta de stock bajo — el administrador configura el umbral (minStock).
// Basado en: PhoneForm.tsx. Antes el formulario no tenía este campo y el
// umbral solo se podía cambiar en la base de datos.

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})
vi.mock('../../../src/services/phones.service', () => ({
  phonesService: { getById: vi.fn(), create: vi.fn(), update: vi.fn() },
}))

const celular = {
  id: 'phone-1', slug: 'iphone-13-usado', name: 'iPhone 13 (Usado)', brand: 'Apple',
  categoryId: 'apple', price: 549000, compareAt: null, badge: null, stock: 5, minStock: 3,
  condition: 'USED', verified: true, batteryHealth: null, storage: null, ram: null,
  camera: null, battery: null, screen: null, chip: null, shortDesc: null, longDesc: null,
  heroImage: null, images: [], colors: [], features: [], category: 'apple', createdAt: '', updatedAt: '',
} as unknown as Phone

beforeEach(() => vi.clearAllMocks())

describe('PhoneForm — stock mínimo de la alerta', () => {
  it('un celular nuevo propone 5, el mismo valor por defecto que el backend', () => {
    render(
      <MemoryRouter>
        <PhoneForm />
      </MemoryRouter>,
    )
    expect(screen.getByLabelText(/stock mínimo/i)).toHaveValue(5)
  })

  it('al editar carga el umbral guardado y envía el nuevo', async () => {
    vi.mocked(phonesService.getById).mockResolvedValue(celular)
    vi.mocked(phonesService.update).mockResolvedValue(celular)
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/admin/phones/phone-1/edit']}>
        <Routes>
          <Route path="/admin/phones/:id/edit" element={<PhoneForm />} />
        </Routes>
      </MemoryRouter>,
    )

    const campo = await screen.findByLabelText(/stock mínimo/i)
    await waitFor(() => expect(campo).toHaveValue(3))
    await user.clear(campo)
    await user.type(campo, '8')
    await user.click(screen.getByRole('button', { name: /guardar|actualizar/i }))

    await waitFor(() =>
      expect(phonesService.update).toHaveBeenCalledWith('phone-1', expect.objectContaining({ minStock: 8 })),
    )
  })

  it('rechaza un umbral negativo', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <PhoneForm />
      </MemoryRouter>,
    )
    const campo = screen.getByLabelText(/stock mínimo/i)
    await user.clear(campo)
    await user.type(campo, '-1')
    await user.click(screen.getByRole('button', { name: /crear|guardar/i }))

    expect(await screen.findAllByText('No puede ser negativo')).not.toHaveLength(0)
    expect(phonesService.create).not.toHaveBeenCalled()
  })
})
