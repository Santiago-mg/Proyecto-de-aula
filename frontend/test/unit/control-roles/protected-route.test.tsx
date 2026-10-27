import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../../../src/components/routes/ProtectedRoute'

// Basado en: components/routes/ProtectedRoute.tsx

const useAuthMock = vi.fn()
vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

function renderProtected(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<p>Login</p>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<p>Dashboard privado</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute — verificación de acceso', () => {
  // Camino 1,2,3,F — no hay sesión activa
  it('redirige a /login si no hay sesión activa', () => {
    useAuthMock.mockReturnValue({ user: null })

    renderProtected('/dashboard')

    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard privado')).not.toBeInTheDocument()
  })

  // Camino 1,2,4,F — sesión activa
  it('renderiza la ruta protegida si hay sesión activa', () => {
    useAuthMock.mockReturnValue({
      user: { id: 'u1', email: 'user@gmail.com', name: 'Mario', role: 'USER', createdAt: '' },
    })

    renderProtected('/dashboard')

    expect(screen.getByText('Dashboard privado')).toBeInTheDocument()
  })
})
