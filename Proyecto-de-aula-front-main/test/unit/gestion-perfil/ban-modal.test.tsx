import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminUsers } from '../../../src/pages/admin/AdminUsers'
import type { AdminUser } from '../../../src/types/admin'

// Basado en: AdminUsers.tsx — BanModal({ reason, onConfirm }) + handleBan()

const useAuthMock = vi.fn()
vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

const banUserMock = vi.fn()
vi.mock('../../../src/services/admin.service', () => ({
  adminService: {
    getUsers: vi.fn(),
    banUser: (...args: unknown[]) => banUserMock(...args),
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

beforeEach(() => {
  vi.clearAllMocks()
  useAuthMock.mockReturnValue({
    user: { id: 'admin-1', email: 'admin@gmail.com', name: 'Admin', role: 'ADMIN', createdAt: '' },
  })
})

describe('AdminUsers — validación y confirmación del motivo de baneo', () => {
  // Camino 1,2,3,4,F — reason.trim().length < 4
  it('deshabilita el botón de confirmar baneo si el motivo tiene menos de 4 caracteres', async () => {
    ;(adminService.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [makeUser()],
      meta: { total: 1, page: 1, totalPages: 1 },
    })

    const user = userEvent.setup()
    render(<AdminUsers />)

    await screen.findByText('Otro Usuario')
    await user.click(screen.getByRole('button', { name: /banear/i }))
    await user.type(screen.getByPlaceholderText(/comportamiento fraudulento/i), 'no')

    expect(screen.getByRole('button', { name: /confirmar baneo/i })).toBeDisabled()
    expect(banUserMock).not.toHaveBeenCalled()
  })

  // Camino 1,2,3,5,6,F — reason.trim().length >= 4
  it('ejecuta adminService.banUser(id, reason) y actualiza la lista cuando el motivo es válido', async () => {
    ;(adminService.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [makeUser()],
      meta: { total: 1, page: 1, totalPages: 1 },
    })
    banUserMock.mockResolvedValue(makeUser({ banned: true, banReason: 'spam' }))

    const user = userEvent.setup()
    render(<AdminUsers />)

    await screen.findByText('Otro Usuario')
    await user.click(screen.getByRole('button', { name: /banear/i }))
    await user.type(screen.getByPlaceholderText(/comportamiento fraudulento/i), 'spam')

    const confirmBtn = screen.getByRole('button', { name: /confirmar baneo/i })
    expect(confirmBtn).toBeEnabled()
    await user.click(confirmBtn)

    await waitFor(() => {
      expect(banUserMock).toHaveBeenCalledWith('user-2', 'spam')
    })
    await waitFor(() => {
      expect(screen.getByText(/baneado/i)).toBeInTheDocument()
    })
  })
})
