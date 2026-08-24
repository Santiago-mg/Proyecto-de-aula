import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Login } from '../../../src/pages/Login'
import { Register } from '../../../src/pages/Register'

// Basado en: Login.tsx / Register.tsx — Navigate condicional (if (user) ...)

const useAuthMock = vi.fn()
vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

function renderWithDashboard(path: '/login' | '/register', Page: () => JSX.Element) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={<Page />} />
        <Route path="/dashboard" element={<p>Dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Guardia de acceso a formularios de auth con sesión activa', () => {
  // Camino 1,2,3,F — credenciales ya validadas en sesión (user presente)
  it('Login redirige de inmediato a /dashboard si hay sesión activa', () => {
    useAuthMock.mockReturnValue({
      user: { id: 'u1', email: 'user@gmail.com', name: 'Mario', role: 'USER', createdAt: '' },
      login: vi.fn(),
      isLoading: false,
    })

    renderWithDashboard('/login', Login)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('Register redirige de inmediato a /dashboard si hay sesión activa', () => {
    useAuthMock.mockReturnValue({
      user: { id: 'u1', email: 'user@gmail.com', name: 'Mario', role: 'USER', createdAt: '' },
      register: vi.fn(),
      isLoading: false,
    })

    renderWithDashboard('/register', Register)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  // Camino 1,2,4,F — no hay credenciales validadas en sesión
  it('muestra el formulario de login/registro si no hay sesión activa', () => {
    useAuthMock.mockReturnValue({ user: null, login: vi.fn(), isLoading: false })
    renderWithDashboard('/login', Login)

    expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })
})
