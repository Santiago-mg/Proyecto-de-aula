import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminUsers } from '../../../src/pages/admin/AdminUsers'
import type { AdminUser } from '../../../src/types/admin'

// ESC-27 — Desbanear usuario
// Basado en: AdminUsers.tsx — handleUnban() + adminService.unbanUser()

const useAuthMock = vi.fn()
vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

const unbanUserMock = vi.fn()
vi.mock('../../../src/services/admin.service', () => ({
  adminService: {
    getUsers: vi.fn(),
    banUser: vi.fn(),
    unbanUser: (...args: unknown[]) => unbanUserMock(...args),
    changeRole: vi.fn(),
  },
}))

import { adminService } from '../../../src/services/admin.service'

function makeUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'user-3',
    email: 'baneado@gmail.com',
    name: 'Usuario Baneado',
    role: 'USER',
    createdAt: '2026-01-01T00:00:00.000Z',
    banned: true,
    banReason: 'spam',
    bannedAt: '2026-01-02T00:00:00.000Z',
    orderCount: 0,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthMock.mockReturnValue({
    user: { id: 'admin-1', email: 'admin@gmail.com', name: 'Admin', role: 'ADMIN', createdAt: '' },
  })
})

describe('AdminUsers — ejecución del desbaneo', () => {
  // Camino 1,2,3,4,F — unbanUser() resuelve sin error
  it('ejecuta adminService.unbanUser(id) y refleja el estado "Activo" al confirmar', async () => {
    ;(adminService.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [makeUser()],
      meta: { total: 1, page: 1, totalPages: 1 },
    })
    unbanUserMock.mockResolvedValue(makeUser({ banned: false, banReason: null, bannedAt: null }))

    const user = userEvent.setup()
    render(<AdminUsers />)

    await screen.findByText('Usuario Baneado')
    await user.click(screen.getByRole('button', { name: /desbanear/i }))

    await waitFor(() => {
      expect(unbanUserMock).toHaveBeenCalledWith('user-3')
    })
    await waitFor(() => {
      expect(screen.getByText(/activo/i)).toBeInTheDocument()
    })
  })

  // Camino 1,2,5,F — el botón permanece deshabilitado mientras la petición está en curso
  it('deshabilita el botón "Desbanear" mientras la petición está en curso', async () => {
    ;(adminService.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [makeUser()],
      meta: { total: 1, page: 1, totalPages: 1 },
    })
    let resolveUnban: (v: AdminUser) => void = () => {}
    unbanUserMock.mockReturnValue(
      new Promise((resolve) => {
        resolveUnban = resolve
      }),
    )

    const user = userEvent.setup()
    render(<AdminUsers />)
    await screen.findByText('Usuario Baneado')

    const btn = screen.getByRole('button', { name: /desbanear/i })
    await user.click(btn)

    expect(btn).toBeDisabled()
    await act(async () => {
      resolveUnban(makeUser({ banned: false, banReason: null, bannedAt: null }))
    })
  })
})
