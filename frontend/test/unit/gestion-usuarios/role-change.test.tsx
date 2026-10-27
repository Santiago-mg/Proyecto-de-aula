import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminUsers } from '../../../src/pages/admin/AdminUsers'
import type { AdminUser } from '../../../src/types/admin'

// Funcionalidad 21 — Cambio de rol de usuario
// Basado en: AdminUsers.tsx — handleRoleChange() + adminService.changeRole()

const useAuthMock = vi.fn()
vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

const changeRoleMock = vi.fn()
vi.mock('../../../src/services/admin.service', () => ({
  adminService: {
    getUsers: vi.fn(),
    banUser: vi.fn(),
    unbanUser: vi.fn(),
    changeRole: (...args: unknown[]) => changeRoleMock(...args),
  },
}))

import { adminService } from '../../../src/services/admin.service'

function makeUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'user-5',
    email: 'cliente@gmail.com',
    name: 'Cliente Regular',
    role: 'USER',
    createdAt: '2026-01-01T00:00:00.000Z',
    banned: false,
    banReason: null,
    bannedAt: null,
    orderCount: 2,
    ...overrides,
  }
}

const admin = { id: 'admin-1', email: 'admin@gmail.com', name: 'Admin', role: 'ADMIN' as const, createdAt: '' }

beforeEach(() => {
  vi.clearAllMocks()
  useAuthMock.mockReturnValue({ user: admin })
})

describe('AdminUsers — cambio de rol de usuario', () => {
  // Camino 1,2,3,4,F — cliente → administrador
  it('llama a changeRole(id, "ADMIN") al hacer admin a un cliente', async () => {
    ;(adminService.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [makeUser({ role: 'USER' })],
      meta: { total: 1, page: 1, totalPages: 1 },
    })
    changeRoleMock.mockResolvedValue(makeUser({ role: 'ADMIN' }))

    const user = userEvent.setup()
    render(<AdminUsers />)

    await screen.findByText('Cliente Regular')
    await user.click(screen.getByRole('button', { name: /hacer admin/i }))

    await waitFor(() => {
      expect(changeRoleMock).toHaveBeenCalledWith('user-5', 'ADMIN')
    })
    await waitFor(() => {
      expect(screen.getByText(/^admin$/i)).toBeInTheDocument()
    })
  })

  // Camino 1,2,5,6,F — administrador → cliente (viceversa)
  it('llama a changeRole(id, "USER") al quitarle el rol admin a otro usuario', async () => {
    ;(adminService.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [makeUser({ id: 'user-6', name: 'Otro Admin', role: 'ADMIN' })],
      meta: { total: 1, page: 1, totalPages: 1 },
    })
    changeRoleMock.mockResolvedValue(makeUser({ id: 'user-6', name: 'Otro Admin', role: 'USER' }))

    const user = userEvent.setup()
    render(<AdminUsers />)

    await screen.findByText('Otro Admin')
    await user.click(screen.getByRole('button', { name: /quitar admin/i }))

    await waitFor(() => {
      expect(changeRoleMock).toHaveBeenCalledWith('user-6', 'USER')
    })
    const row = screen.getByText('Otro Admin').closest('tr')!
    await waitFor(() => {
      expect(row.querySelector('.cp-badge')?.textContent).toMatch(/usuario/i)
    })
  })

  // Guarda de auto-protección: un admin no puede cambiarse el rol a sí mismo
  it('no ofrece el botón de cambio de rol en la fila del propio admin', async () => {
    ;(adminService.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [makeUser({ id: 'admin-1', name: 'Admin', email: 'admin@gmail.com', role: 'ADMIN' })],
      meta: { total: 1, page: 1, totalPages: 1 },
    })

    render(<AdminUsers />)

    await screen.findByText('admin@gmail.com')
    expect(
      screen.queryByRole('button', { name: /quitar admin|hacer admin/i }),
    ).not.toBeInTheDocument()
    expect(changeRoleMock).not.toHaveBeenCalled()
  })

  // El botón debe deshabilitarse mientras la petición está en curso
  it('deshabilita el botón de cambio de rol mientras la petición está en curso', async () => {
    ;(adminService.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [makeUser()],
      meta: { total: 1, page: 1, totalPages: 1 },
    })
    let resolveChange: (v: AdminUser) => void = () => {}
    changeRoleMock.mockReturnValue(
      new Promise((resolve) => {
        resolveChange = resolve
      }),
    )

    const user = userEvent.setup()
    render(<AdminUsers />)
    await screen.findByText('Cliente Regular')

    const btn = screen.getByRole('button', { name: /hacer admin/i })
    await user.click(btn)

    expect(btn).toBeDisabled()
    resolveChange(makeUser({ role: 'ADMIN' }))
  })
})
