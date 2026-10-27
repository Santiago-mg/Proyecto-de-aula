import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Register } from '../../../src/pages/Register'

// Basado en: Register.tsx — política de contraseñas (validation/credenciales.ts)

const registerFn = vi.fn()
vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: null, register: registerFn, isLoading: false }),
}))

beforeEach(() => registerFn.mockReset())

async function enviar(password: string) {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  )
  await user.type(screen.getByLabelText(/nombre completo/i), 'Ana Pérez')
  await user.type(screen.getByLabelText(/email/i), 'Ana@Gmail.com')
  await user.type(screen.getByLabelText(/^contraseña$/i), password)
  await user.type(screen.getByLabelText(/confirmar contraseña/i), password)
  await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
}

describe('Register — política de contraseñas', () => {
  it('muestra la ayuda con las reglas antes de escribir', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    )
    expect(screen.getByText(/mínimo 8 caracteres, con mayúscula, minúscula y número/i)).toBeInTheDocument()
  })

  it('bloquea una contraseña sin mayúscula y no llama a la API', async () => {
    await enviar('password123')

    expect(
      await screen.findByText('La contraseña debe incluir al menos una letra mayúscula'),
    ).toBeInTheDocument()
    expect(registerFn).not.toHaveBeenCalled()
  })

  it('envía el correo normalizado cuando todo es válido', async () => {
    registerFn.mockResolvedValue(undefined)
    await enviar('Password123')

    await waitFor(() =>
      expect(registerFn).toHaveBeenCalledWith('ana@gmail.com', 'Ana Pérez', 'Password123'),
    )
  })
})
