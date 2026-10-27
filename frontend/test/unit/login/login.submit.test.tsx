import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Login } from '../../../src/pages/Login'

// Basado en: Login.tsx — onSubmit() + AuthContext.login()

const useAuthMock = vi.fn()
const navigateMock = vi.fn()

vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

beforeEach(() => {
  navigateMock.mockClear()
})

function renderLoginWithDashboardRoute() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<p>Dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Login — envío de credenciales y autenticación', () => {
  // Camino 1,2,3,F — usuario ya autenticado visita /login
  it('redirige de inmediato a /dashboard si ya hay sesión activa', () => {
    useAuthMock.mockReturnValue({
      user: { id: 'u1', email: 'user@gmail.com', name: 'Mario', role: 'USER', createdAt: '' },
      login: vi.fn(),
      isLoading: false,
    })

    renderLoginWithDashboardRoute()

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ingresar/i })).not.toBeInTheDocument()
  })

  // Camino 1,2,4,5,6,7,8,F — credenciales correctas
  it('inicia sesión y navega a /dashboard cuando login() resuelve sin error', async () => {
    const loginFn = vi.fn().mockResolvedValue(undefined)
    useAuthMock.mockReturnValue({ user: null, login: loginFn, isLoading: false })

    const user = userEvent.setup()
    renderLoginWithDashboardRoute()

    await user.type(screen.getByLabelText(/email/i), 'user@gmail.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'password123')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    await waitFor(() => {
      expect(loginFn).toHaveBeenCalledWith('user@gmail.com', 'password123')
    })
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard')
    })
  })

  // Camino 1,2,4,5,6,7,9,F — credenciales incorrectas o cuenta baneada
  it('muestra el mensaje de error y permanece en /login cuando login() rechaza', async () => {
    const loginFn = vi.fn().mockRejectedValue(new Error('Credenciales inválidas'))
    useAuthMock.mockReturnValue({ user: null, login: loginFn, isLoading: false })

    const user = userEvent.setup()
    renderLoginWithDashboardRoute()

    await user.type(screen.getByLabelText(/email/i), 'user@gmail.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    await waitFor(() => {
      expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument()
    })
    expect(navigateMock).not.toHaveBeenCalled()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })
})
