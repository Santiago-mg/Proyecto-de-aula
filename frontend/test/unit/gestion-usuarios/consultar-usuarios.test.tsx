import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminUsers } from '../../../src/pages/admin/AdminUsers'
import type { AdminUser } from '../../../src/types/admin'

// ESC-28 — Consultar usuarios registrados
// Basado en: AdminUsers.tsx — load() + handleSearchChange() (debounce 400ms) + Pagination

const useAuthMock = vi.fn()
vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

const getUsersMock = vi.fn()
vi.mock('../../../src/services/admin.service', () => ({
  adminService: {
    getUsers: (...args: unknown[]) => getUsersMock(...args),
    banUser: vi.fn(),
    unbanUser: vi.fn(),
    changeRole: vi.fn(),
  },
}))

function makeUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'user-1',
    email: 'ana@gmail.com',
    name: 'Ana',
    role: 'USER',
    createdAt: '2026-01-01T00:00:00.000Z',
    banned: false,
    banReason: null,
    bannedAt: null,
    orderCount: 2,
    ...overrides,
  }
}

const admin = {
  id: 'admin-1',
  email: 'admin@gmail.com',
  name: 'Admin',
  role: 'ADMIN' as const,
  createdAt: '',
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthMock.mockReturnValue({ user: admin })
})

describe('AdminUsers — carga, búsqueda y paginación de usuarios', () => {
  // Camino 1,2,F — carga inicial (page=1, sin término de búsqueda)
  it('carga la lista de usuarios al montar, con page=1 y sin filtro', async () => {
    getUsersMock.mockResolvedValue({
      data: [makeUser()],
      meta: { total: 1, page: 1, totalPages: 1 },
    })

    render(<AdminUsers />)

    await screen.findByText('Ana')
    expect(getUsersMock).toHaveBeenCalledWith(1, undefined)
  })

  // Camino 1,2,3,4,F — el usuario escribe en el buscador (debounce de 400ms)
  it('espera el debounce, resetea a la página 1 y busca con el término escrito', async () => {
    getUsersMock.mockResolvedValue({
      data: [makeUser()],
      meta: { total: 1, page: 1, totalPages: 1 },
    })

    const user = userEvent.setup()
    render(<AdminUsers />)
    await screen.findByText('Ana')
    getUsersMock.mockClear()

    await user.type(screen.getByPlaceholderText(/buscar por nombre o email/i), 'ana')

    await waitFor(
      () => {
        expect(getUsersMock).toHaveBeenCalledWith(1, 'ana')
      },
      { timeout: 1000 },
    )
  })

  // Camino 1,2,5,6,F — paginación: avanzar a la página siguiente
  it('al hacer click en "Siguiente" solicita la página 2', async () => {
    getUsersMock
      .mockResolvedValueOnce({
        data: [makeUser()],
        meta: { total: 25, page: 1, totalPages: 2 },
      })
      .mockResolvedValueOnce({
        data: [makeUser({ id: 'user-2', name: 'Beto' })],
        meta: { total: 25, page: 2, totalPages: 2 },
      })

    const user = userEvent.setup()
    render(<AdminUsers />)
    await screen.findByText('Ana')

    await user.click(screen.getByRole('button', { name: /siguiente/i }))

    await waitFor(() => {
      expect(getUsersMock).toHaveBeenCalledWith(2, undefined)
    })
    await screen.findByText('Beto')
  })
})
