import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Register } from '../../../src/pages/Register'

// Basado en: Register.tsx — onSubmit() + AuthContext.register()

const useAuthMock = vi.fn()
const navigateMock = vi.fn()

vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/nombre completo/i), 'Mario')
  await user.type(screen.getByLabelText(/email/i), 'user@gmail.com')
  await user.type(screen.getByLabelText(/^contraseña$/i), 'password123')
  await user.type(screen.getByLabelText(/confirmar contraseña/i), 'password123')
  await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
}

beforeEach(() => {
  navigateMock.mockClear()
})

describe('Register — envío del formulario', () => {
  // Camino 1,2,3,4,5,F — datos válidos, email no registrado
  it('crea la cuenta y navega a /dashboard cuando registerUser() resuelve sin error', async () => {
    const registerFn = vi.fn().mockResolvedValue(undefined)
    useAuthMock.mockReturnValue({ user: null, register: registerFn, isLoading: false })

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    )
    await fillAndSubmit(user)

    await waitFor(() => {
      expect(registerFn).toHaveBeenCalledWith('user@gmail.com', 'Mario', 'password123')
    })
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard')
    })
  })

  // Camino 1,2,3,4,6,7,F — email ya registrado en el sistema
  it('muestra el mensaje de error del servidor y no navega si registerUser() rechaza', async () => {
    const registerFn = vi.fn().mockRejectedValue(new Error('El email ya está registrado'))
    useAuthMock.mockReturnValue({ user: null, register: registerFn, isLoading: false })

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    )
    await fillAndSubmit(user)

    await waitFor(() => {
      expect(screen.getByText('El email ya está registrado')).toBeInTheDocument()
    })
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
