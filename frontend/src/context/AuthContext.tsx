import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { AuthResponse, User } from '../types/auth'
import { authService } from '../services/auth.service'

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  login(email: string, password: string): Promise<void>
  register(email: string, name: string, password: string): Promise<void>
  logout(): void
  updateProfile(name: string): Promise<void>
  changePassword(currentPassword: string, newPassword: string): Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('cp_user')
      return stored ? (JSON.parse(stored) as User) : null
    } catch {
      return null
    }
  })

  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('cp_token'),
  )

  const [isLoading, setIsLoading] = useState(false)

  // Sincroniza localStorage cuando cambian user/token
  useEffect(() => {
    if (user && token) {
      localStorage.setItem('cp_user', JSON.stringify(user))
      localStorage.setItem('cp_token', token)
    } else {
      localStorage.removeItem('cp_user')
      localStorage.removeItem('cp_token')
    }
  }, [user, token])

  // Control de roles: el usuario guardado en localStorage es una foto del
  // momento del login. Si después un admin le cambió el rol o lo suspendió,
  // el frontend seguía mostrando el menú viejo. Al abrir la aplicación se
  // relee el perfil; un 401/403 lo resuelve el interceptor de api.ts.
  useEffect(() => {
    if (!token) return
    let vigente = true
    authService
      .me()
      .then((perfil) => {
        if (vigente) setUser(perfil)
      })
      .catch(() => {
        // Sin conexión: se conserva la sesión local hasta el próximo intento.
      })
    return () => {
      vigente = false
    }
    // Solo al montar: login() y register() ya traen el perfil fresco.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Se guarda en localStorage en el mismo momento, no solo en el useEffect:
  // los efectos corren después de pintar, y una recarga o navegación justo
  // después del login perdía la sesión recién iniciada.
  function abrirSesion(result: AuthResponse) {
    localStorage.setItem('cp_user', JSON.stringify(result.user))
    localStorage.setItem('cp_token', result.token)
    setUser(result.user)
    setToken(result.token)
  }

  async function login(email: string, password: string) {
    setIsLoading(true)
    try {
      abrirSesion(await authService.login({ email, password }))
    } finally {
      setIsLoading(false)
    }
  }

  async function register(email: string, name: string, password: string) {
    setIsLoading(true)
    try {
      abrirSesion(await authService.register({ email, name, password }))
    } finally {
      setIsLoading(false)
    }
  }

  function logout() {
    setUser(null)
    setToken(null)
  }

  async function updateProfile(name: string) {
    const perfil = await authService.updateProfile({ name })
    setUser(perfil)
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    await authService.changePassword({ currentPassword, newPassword })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
