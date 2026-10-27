import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminRoute } from '../../../src/components/routes/AdminRoute'

// Basado en: components/routes/AdminRoute.tsx

const useAuthMock = vi.fn()
vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

function renderAdmin(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<p>Login</p>} />
        <Route path="/unauthorized" element={<p>No autorizado</p>} />
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<p>Panel de administración</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminRoute — verificación de acceso', () => {
  // Camino 1,2,3,F — no hay sesión activa
  it('redirige a /login si no hay sesión activa', () => {
    useAuthMock.mockReturnValue({ user: null })

    renderAdmin('/admin')

    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  // Camino 1,2,4,5,F — sesión activa con rol USER
  it('redirige a /unauthorized si el usuario no es ADMIN', () => {
    useAuthMock.mockReturnValue({
      user: { id: 'u1', email: 'user@gmail.com', name: 'Mario', role: 'USER', createdAt: '' },
    })

    renderAdmin('/admin')

    expect(screen.getByText('No autorizado')).toBeInTheDocument()
  })

  // Camino 1,2,4,6,F — sesión activa con rol ADMIN
  it('renderiza el panel de administración si el usuario es ADMIN', () => {
    useAuthMock.mockReturnValue({
      user: { id: 'u1', email: 'admin@gmail.com', name: 'Admin', role: 'ADMIN', createdAt: '' },
    })

    renderAdmin('/admin')

    expect(screen.getByText('Panel de administración')).toBeInTheDocument()
  })
})
