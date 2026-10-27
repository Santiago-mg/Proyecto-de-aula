import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PhoneForm } from '../../../src/pages/admin/PhoneForm'
import { phonesService } from '../../../src/services/phones.service'
import type { Phone } from '../../../src/types/phone'

// ESC-30 — Administración del catálogo (crear/editar)
// Basado en: PhoneForm.tsx — schema Zod + onSubmit() (crear vs. editar)

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('../../../src/services/phones.service', () => ({
  phonesService: {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}))

function makePhone(overrides: Partial<Phone> = {}): Phone {
  return {
    id: 'phone-1',
    slug: 'iphone-15',
    name: 'iPhone 15',
    brand: 'Apple',
    categoryId: 'apple',
    price: 3000000,
    compareAt: null,
    badge: null,
    stock: 5,
    condition: 'NEW',
    verified: true,
    batteryHealth: null,
    storage: '128GB',
    ram: '6GB',
    camera: null,
    battery: null,
    screen: null,
    chip: null,
    shortDesc: null,
    longDesc: null,
    heroImage: null,
    images: [],
    colors: [],
    features: [],
    category: 'apple',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^nombre$/i), 'iPhone 15')
  await user.type(screen.getByLabelText(/slug/i), 'iphone-15')
  await user.type(screen.getByLabelText(/marca/i), 'Apple')
  await user.selectOptions(screen.getByLabelText(/categoría/i), 'apple')
  await user.type(screen.getByLabelText(/^precio \(cop\)$/i), '3000000')
  await user.type(screen.getByLabelText(/^stock$/i), '5')
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PhoneForm — validación y creación', () => {
  // Camino 1,2,3,F — se envía el formulario con campos requeridos vacíos
  it('muestra errores de validación y no llama a create() si faltan campos requeridos', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/admin/phones/new']}>
        <Routes>
          <Route path="/admin/phones/new" element={<PhoneForm />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /crear celular/i }))

    await waitFor(() => {
      expect(screen.getAllByText(/mínimo 3 caracteres|requerido/i).length).toBeGreaterThan(0)
    })
    expect(phonesService.create).not.toHaveBeenCalled()
  })

  // Camino 1,2,4,5,6,F — datos válidos en modo creación
  it('crea el celular y navega a /admin/phones cuando los datos son válidos', async () => {
    ;(phonesService.create as ReturnType<typeof vi.fn>).mockResolvedValue(makePhone())

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/admin/phones/new']}>
        <Routes>
          <Route path="/admin/phones/new" element={<PhoneForm />} />
        </Routes>
      </MemoryRouter>,
    )

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /crear celular/i }))

    await waitFor(() => {
      expect(phonesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'iphone-15', name: 'iPhone 15', brand: 'Apple' }),
      )
    })
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/admin/phones')
    })
  })

  // Camino 1,2,4,7,8,F — el servidor rechaza la creación
  it('muestra el error del servidor y no navega si create() rechaza', async () => {
    ;(phonesService.create as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('El slug ya está en uso'),
    )

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/admin/phones/new']}>
        <Routes>
          <Route path="/admin/phones/new" element={<PhoneForm />} />
        </Routes>
      </MemoryRouter>,
    )

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /crear celular/i }))

    await waitFor(() => {
      expect(screen.getByText('El slug ya está en uso')).toBeInTheDocument()
    })
    expect(navigateMock).not.toHaveBeenCalled()
  })
})

describe('PhoneForm — edición de un celular existente', () => {
  // Camino 1,2,3,4,F — se carga el celular por id y se precargan los campos
  it('precarga el formulario con los datos del celular al editar', async () => {
    ;(phonesService.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makePhone({ name: 'iPhone 15 Pro' }),
    )

    render(
      <MemoryRouter initialEntries={['/admin/phones/phone-1/edit']}>
        <Routes>
          <Route path="/admin/phones/:id/edit" element={<PhoneForm />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByDisplayValue('iPhone 15 Pro')).toBeInTheDocument()
    expect(phonesService.getById).toHaveBeenCalledWith('phone-1')
  })

  // Camino 1,2,3,5,6,7,F — se guardan los cambios y se llama a update(id, data)
  it('llama a phonesService.update(id, data) y navega al guardar cambios', async () => {
    ;(phonesService.getById as ReturnType<typeof vi.fn>).mockResolvedValue(makePhone())
    ;(phonesService.update as ReturnType<typeof vi.fn>).mockResolvedValue(makePhone())

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/admin/phones/phone-1/edit']}>
        <Routes>
          <Route path="/admin/phones/:id/edit" element={<PhoneForm />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByDisplayValue('iPhone 15')
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }))

    await waitFor(() => {
      expect(phonesService.update).toHaveBeenCalledWith(
        'phone-1',
        expect.objectContaining({ slug: 'iphone-15' }),
      )
    })
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/admin/phones')
    })
  })
})
