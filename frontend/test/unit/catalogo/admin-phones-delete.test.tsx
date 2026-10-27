import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AdminPhones } from '../../../src/pages/admin/AdminPhones'
import { phonesService } from '../../../src/services/phones.service'
import type { PhoneListItem } from '../../../src/types/phone'

// ESC-30 — Administración del catálogo (eliminar)
// Basado en: AdminPhones.tsx — handleDelete() + confirm() + phonesService.remove()

vi.mock('../../../src/services/phones.service', () => ({
  phonesService: {
    getAll: vi.fn(),
    remove: vi.fn(),
  },
}))

function makePhone(overrides: Partial<PhoneListItem> = {}): PhoneListItem {
  return {
    id: 'phone-1',
    slug: 'iphone-15',
    name: 'iPhone 15',
    brand: 'Apple',
    price: 3000000,
    compareAt: null,
    badge: null,
    stock: 5,
    condition: 'NEW',
    verified: true,
    batteryHealth: null,
    storage: '128GB',
    ram: '6GB',
    shortDesc: null,
    heroImage: null,
    category: 'apple',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AdminPhones — eliminación de un celular', () => {
  // Camino 1,2,3,F — el admin cancela el diálogo de confirmación
  it('no elimina el celular si el admin cancela la confirmación', async () => {
    ;(phonesService.getAll as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [makePhone()],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    })
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AdminPhones />
      </MemoryRouter>,
    )
    await screen.findByText('iPhone 15')

    await user.click(screen.getByTitle('Eliminar'))

    expect(phonesService.remove).not.toHaveBeenCalled()
    expect(screen.getByText('iPhone 15')).toBeInTheDocument()
  })

  // Camino 1,2,4,5,6,F — confirma y remove() resuelve sin error
  it('elimina el celular de la lista cuando se confirma y remove() resuelve', async () => {
    ;(phonesService.getAll as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [makePhone()],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    })
    ;(phonesService.remove as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AdminPhones />
      </MemoryRouter>,
    )
    await screen.findByText('iPhone 15')

    await user.click(screen.getByTitle('Eliminar'))

    await waitFor(() => {
      expect(phonesService.remove).toHaveBeenCalledWith('phone-1')
    })
    expect(screen.queryByText('iPhone 15')).not.toBeInTheDocument()
  })

  // Camino 1,2,4,7,8,F — confirma pero remove() lanza error
  it('muestra una alerta y conserva el celular en la lista si remove() falla', async () => {
    ;(phonesService.getAll as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [makePhone()],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    })
    ;(phonesService.remove as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AdminPhones />
      </MemoryRouter>,
    )
    await screen.findByText('iPhone 15')

    await user.click(screen.getByTitle('Eliminar'))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error al eliminar el celular')
    })
    expect(screen.getByText('iPhone 15')).toBeInTheDocument()
  })
})
