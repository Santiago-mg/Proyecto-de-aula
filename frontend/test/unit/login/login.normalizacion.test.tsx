import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AxiosError, AxiosHeaders } from 'axios'
import { Login } from '../../../src/pages/Login'

// Basado en: Login.tsx — normalización del correo, error del servidor y
// aviso de sesión cerrada por el interceptor.

const loginFn = vi.fn()
vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: null, login: loginFn, isLoading: false }),
}))

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  loginFn.mockReset()
  sessionStorage.clear()
})

describe('Login — inicio de sesión', () => {
  it('envía el correo en minúsculas y sin espacios', async () => {
    loginFn.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(/email/i), '  Ana@Gmail.COM')
    await user.type(screen.getByLabelText(/contraseña/i), 'Password123')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    await waitFor(() => expect(loginFn).toHaveBeenCalledWith('ana@gmail.com', 'Password123'))
  })

  it('muestra "Credenciales inválidas" cuando el servidor responde 401', async () => {
    const respuesta = {
      status: 401,
      statusText: 'Unauthorized',
      data: { error: 'Credenciales inválidas' },
      headers: {},
      config: { headers: new AxiosHeaders() },
    }
    loginFn.mockRejectedValue(
      new AxiosError('401', 'ERR_BAD_REQUEST', respuesta.config, null, respuesta),
    )
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(/email/i), 'ana@gmail.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'Equivocada1')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument()
  })

  it('muestra el aviso que dejó el interceptor al cerrar la sesión', () => {
    sessionStorage.setItem('cp_auth_notice', 'Tu cuenta ha sido suspendida. Motivo: fraude')

    renderLogin()

    expect(screen.getByTestId('aviso-sesion')).toHaveTextContent('Motivo: fraude')
    expect(sessionStorage.getItem('cp_auth_notice')).toBeNull()
  })
})
