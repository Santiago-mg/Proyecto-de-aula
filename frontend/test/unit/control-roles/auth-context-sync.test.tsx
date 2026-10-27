import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../../src/context/AuthContext'

// Basado en: context/AuthContext.tsx — relectura del perfil al montar.
//
// El usuario de localStorage es una foto del momento del login. Si un admin
// le quitó el rol después, la app debe enterarse al abrirse.

vi.mock('../../../src/services/auth.service', () => ({
  authService: { me: vi.fn(), login: vi.fn(), register: vi.fn(), updateProfile: vi.fn(), changePassword: vi.fn() },
}))
import { authService } from '../../../src/services/auth.service'

function MostrarRol() {
  const { user } = useAuth()
  return <p data-testid="rol">{user?.role ?? 'sin sesión'}</p>
}

const guardado = { id: 'u1', email: 'ana@gmail.com', name: 'Ana', role: 'ADMIN', createdAt: '' }

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('AuthProvider — sincronización del rol', () => {
  it('reemplaza el rol guardado por el que devuelve /auth/me', async () => {
    localStorage.setItem('cp_token', 'token')
    localStorage.setItem('cp_user', JSON.stringify(guardado))
    vi.mocked(authService.me).mockResolvedValue({ ...guardado, role: 'USER' })

    render(
      <AuthProvider>
        <MostrarRol />
      </AuthProvider>,
    )

    expect(screen.getByTestId('rol')).toHaveTextContent('ADMIN')
    await waitFor(() => expect(screen.getByTestId('rol')).toHaveTextContent('USER'))
    expect(JSON.parse(localStorage.getItem('cp_user')!).role).toBe('USER')
  })

  it('sin token no consulta el perfil', () => {
    render(
      <AuthProvider>
        <MostrarRol />
      </AuthProvider>,
    )

    expect(authService.me).not.toHaveBeenCalled()
    expect(screen.getByTestId('rol')).toHaveTextContent('sin sesión')
  })

  it('si /auth/me falla por red, conserva la sesión local', async () => {
    localStorage.setItem('cp_token', 'token')
    localStorage.setItem('cp_user', JSON.stringify(guardado))
    vi.mocked(authService.me).mockRejectedValue(new Error('Network Error'))

    render(
      <AuthProvider>
        <MostrarRol />
      </AuthProvider>,
    )

    await waitFor(() => expect(authService.me).toHaveBeenCalled())
    expect(screen.getByTestId('rol')).toHaveTextContent('ADMIN')
  })
})

describe('AuthProvider — persistencia inmediata de la sesión', () => {
  it('login() deja la sesión en localStorage antes de terminar', async () => {
    const usuario = { id: 'u1', email: 'ana@gmail.com', name: 'Ana', role: 'USER' as const, createdAt: '' }
    vi.mocked(authService.login).mockResolvedValue({ user: usuario, token: 'tok-1' })
    let loginFn: (e: string, p: string) => Promise<void> = async () => {}
    function Capturar() {
      loginFn = useAuth().login
      return null
    }
    render(
      <AuthProvider>
        <Capturar />
      </AuthProvider>,
    )

    await loginFn('ana@gmail.com', 'Password123')

    // Comprobado justo al resolver login(), sin esperar a que React vuelva a
    // pintar: así lo encuentra una recarga inmediata de la página.
    expect(localStorage.getItem('cp_token')).toBe('tok-1')
    expect(JSON.parse(localStorage.getItem('cp_user')!).email).toBe('ana@gmail.com')
  })
})
