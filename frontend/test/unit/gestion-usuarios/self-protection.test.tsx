import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { AdminUsers } from '../../../src/pages/admin/AdminUsers'
import type { AdminUser } from '../../../src/types/admin'

// Basado en: AdminUsers.tsx — render de la columna Acciones por fila

const useAuthMock = vi.fn()
vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('../../../src/services/admin.service', () => ({
  adminService: {
    getUsers: vi.fn(),
    banUser: vi.fn(),
    unbanUser: vi.fn(),
    changeRole: vi.fn(),
  },
}))

import { adminService } from '../../../src/services/admin.service'

function makeUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'user-2',
    email: 'otro@gmail.com',
    name: 'Otro Usuario',
    role: 'USER',
    createdAt: '2026-01-01T00:00:00.000Z',
    banned: false,
    banReason: null,
    bannedAt: null,
    orderCount: 0,
    ...overrides,
  }
}

const admin = { id: 'admin-1', email: 'admin@gmail.com', name: 'Admin', role: 'ADMIN' as const, createdAt: '' }

beforeEach(() => {
  vi.clearAllMocks()
  useAuthMock.mockReturnValue({ user: admin })
})

describe('AdminUsers — guardia de auto-protección y estado de la fila', () => {
  // Camino 1,2,3,F — u.id === me?.id (fila del propio admin)
  it('no muestra botones de banear/desbanear en la fila del propio admin', async () => {
    ;(adminService.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [makeUser({ id: 'admin-1', name: 'Admin', email: 'admin@gmail.com', role: 'ADMIN' })],
      meta: { total: 1, page: 1, totalPages: 1 },
    })

    render(<AdminUsers />)
    const row = (await screen.findByText('admin@gmail.com')).closest('tr')!

    expect(within(row).queryByRole('button', { name: /banear/i })).not.toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: /desbanear/i })).not.toBeInTheDocument()
  })

  // Camino 1,2,4,5,F — u.id !== me?.id y u.banned === true
  it('muestra el botón "Desbanear" en la fila de otro usuario baneado', async () => {
    ;(adminService.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [makeUser({ banned: true, banReason: 'spam' })],
      meta: { total: 1, page: 1, totalPages: 1 },
    })

    render(<AdminUsers />)
    const row = (await screen.findByText('Otro Usuario')).closest('tr')!

    expect(within(row).getByRole('button', { name: /desbanear/i })).toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: /^banear/i })).not.toBeInTheDocument()
  })

  // Camino 1,2,4,6,F — u.id !== me?.id y u.banned === false
  it('muestra el botón "Banear" en la fila de otro usuario activo', async () => {
    ;(adminService.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [makeUser({ banned: false })],
      meta: { total: 1, page: 1, totalPages: 1 },
    })

    render(<AdminUsers />)
    const row = (await screen.findByText('Otro Usuario')).closest('tr')!

    expect(within(row).getByRole('button', { name: /^banear/i })).toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: /desbanear/i })).not.toBeInTheDocument()
  })
})
