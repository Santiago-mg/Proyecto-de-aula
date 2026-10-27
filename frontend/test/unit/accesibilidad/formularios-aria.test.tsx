import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Login } from '../../../src/pages/Login'
import { Register } from '../../../src/pages/Register'

// Accesibilidad de formularios (WCAG 1.3.1 y 3.3.1): el error de un campo debe
// estar asociado a ese campo, para que un lector de pantalla lo anuncie al
// llegar a él. Antes el mensaje solo aparecía debajo, sin relación programática.

vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: null, login: vi.fn(), register: vi.fn(), isLoading: false }),
}))

function enRouter(ui: JSX.Element) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Formularios — errores asociados a su campo', () => {
  it('Login: un campo sin error no se marca como inválido', () => {
    enRouter(<Login />)
    expect(screen.getByLabelText(/email/i)).not.toHaveAttribute('aria-invalid')
  })

  it('Login: el campo con error queda inválido y su descripción accesible es el mensaje', async () => {
    const user = userEvent.setup()
    enRouter(<Login />)

    await user.type(screen.getByLabelText(/email/i), 'no-es-correo')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    const email = screen.getByLabelText(/email/i)
    expect(await screen.findByText('Email inválido')).toBeInTheDocument()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAccessibleDescription('Email inválido')
  })

  it('Registro: la ayuda de la contraseña es su descripción hasta que aparece un error', async () => {
    const user = userEvent.setup()
    enRouter(<Register />)
    const password = screen.getByLabelText(/^contraseña$/i)

    expect(password).toHaveAccessibleDescription('Mínimo 8 caracteres, con mayúscula, minúscula y número')

    await user.type(password, 'corta')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    expect(await screen.findByText('La contraseña debe tener al menos 8 caracteres')).toBeInTheDocument()
    expect(password).toHaveAccessibleDescription('La contraseña debe tener al menos 8 caracteres')
  })

  it('Registro: los errores se anuncian (role="alert")', async () => {
    const user = userEvent.setup()
    enRouter(<Register />)

    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    expect((await screen.findAllByRole('alert')).length).toBeGreaterThanOrEqual(3)
  })
})
