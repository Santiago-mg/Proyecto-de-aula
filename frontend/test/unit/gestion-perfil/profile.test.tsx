import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AxiosError, AxiosHeaders } from 'axios'
import { Profile } from '../../../src/pages/Profile'

// Basado en: pages/Profile.tsx — gestión de perfil (nombre y contraseña)

const updateProfile = vi.fn()
const changePassword = vi.fn()
const showToast = vi.fn()
let rol: 'USER' | 'ADMIN' = 'USER'

vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'ana@gmail.com', name: 'Ana Pérez', role: rol, createdAt: '' },
    updateProfile,
    changePassword,
  }),
}))
vi.mock('../../../src/context/ToastContext', () => ({
  useToast: () => ({ showToast }),
}))

function errorDelServidor(status: number, mensaje: string) {
  const respuesta = {
    status,
    statusText: '',
    data: { error: mensaje },
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
  return new AxiosError(mensaje, 'ERR_BAD_REQUEST', respuesta.config, null, respuesta)
}

function renderProfile() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  rol = 'USER'
})

describe('Profile — datos de la cuenta', () => {
  it('muestra el correo, el tipo de cuenta y el nombre actual', () => {
    renderProfile()

    expect(screen.getByTestId('perfil-email')).toHaveTextContent('ana@gmail.com')
    expect(screen.getByTestId('perfil-rol')).toHaveTextContent('Cliente')
    expect(screen.getByLabelText(/nombre completo/i)).toHaveValue('Ana Pérez')
  })

  it('muestra "Administrador" para una cuenta ADMIN', () => {
    rol = 'ADMIN'
    renderProfile()
    expect(screen.getByTestId('perfil-rol')).toHaveTextContent('Administrador')
  })

  it('el botón de guardar está deshabilitado hasta que el nombre cambia', async () => {
    const user = userEvent.setup()
    renderProfile()
    const boton = screen.getByRole('button', { name: /guardar nombre/i })

    expect(boton).toBeDisabled()
    await user.type(screen.getByLabelText(/nombre completo/i), ' María')
    expect(boton).toBeEnabled()
  })
})

describe('Profile — cambiar el nombre', () => {
  it('guarda el nombre recortado y avisa con un toast', async () => {
    updateProfile.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderProfile()

    const campo = screen.getByLabelText(/nombre completo/i)
    await user.clear(campo)
    await user.type(campo, '  Ana María  ')
    await user.click(screen.getByRole('button', { name: /guardar nombre/i }))

    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith('Ana María'))
    expect(showToast).toHaveBeenCalledWith('Nombre actualizado')
  })

  it('no envía un nombre de una letra', async () => {
    const user = userEvent.setup()
    renderProfile()

    const campo = screen.getByLabelText(/nombre completo/i)
    await user.clear(campo)
    await user.type(campo, 'A')
    await user.click(screen.getByRole('button', { name: /guardar nombre/i }))

    expect(await screen.findByText('El nombre debe tener al menos 2 caracteres')).toBeInTheDocument()
    expect(updateProfile).not.toHaveBeenCalled()
  })
})

describe('Profile — cambiar la contraseña', () => {
  async function llenar(actual: string, nueva: string, repetida = nueva) {
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/contraseña actual/i), actual)
    await user.type(screen.getByLabelText(/^contraseña nueva$/i), nueva)
    await user.type(screen.getByLabelText(/repite la contraseña nueva/i), repetida)
    await user.click(screen.getByRole('button', { name: /cambiar contraseña/i }))
  }

  it('cambia la contraseña, limpia el formulario y lo confirma', async () => {
    changePassword.mockResolvedValue(undefined)
    renderProfile()

    await llenar('Actual123', 'Nueva1234')

    await waitFor(() => expect(changePassword).toHaveBeenCalledWith('Actual123', 'Nueva1234'))
    expect(await screen.findByRole('status')).toHaveTextContent('Contraseña actualizada')
    expect(screen.getByLabelText(/contraseña actual/i)).toHaveValue('')
  })

  it('aplica la política de contraseñas a la nueva', async () => {
    renderProfile()

    await llenar('Actual123', 'nueva1234')

    expect(
      await screen.findByText('La contraseña debe incluir al menos una letra mayúscula'),
    ).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('avisa si la confirmación no coincide', async () => {
    renderProfile()

    await llenar('Actual123', 'Nueva1234', 'Nueva12345')

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('muestra el error del servidor cuando la contraseña actual es incorrecta', async () => {
    changePassword.mockRejectedValue(errorDelServidor(400, 'La contraseña actual no es correcta'))
    renderProfile()

    await llenar('Mala12345', 'Nueva1234')

    expect(await screen.findByText('La contraseña actual no es correcta')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
