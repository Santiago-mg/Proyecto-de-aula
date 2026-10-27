import axios from 'axios'

// Cliente HTTP centralizado — el token se inyecta automáticamente en cada request
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
})

const CLAVE_AVISO = 'cp_auth_notice'

/**
 * Peticiones en las que un 401 significa "credenciales incorrectas" y no
 * "sesión vencida". Si el interceptor las tratara igual, al equivocarse de
 * contraseña la página se recargaría en /login y el usuario nunca vería el
 * mensaje "Credenciales inválidas".
 */
const RUTAS_DE_CREDENCIALES = ['/auth/login', '/auth/register']

function esRutaDeCredenciales(url: string | undefined): boolean {
  return RUTAS_DE_CREDENCIALES.some((ruta) => url?.endsWith(ruta))
}

function cerrarSesionLocal(aviso: string) {
  localStorage.removeItem('cp_token')
  localStorage.removeItem('cp_user')
  sessionStorage.setItem(CLAVE_AVISO, aviso)
  window.location.href = '/login'
}

/** Devuelve el aviso que dejó el último cierre forzado de sesión y lo borra. */
export function consumirAvisoDeSesion(): string | null {
  const aviso = sessionStorage.getItem(CLAVE_AVISO)
  if (aviso) sessionStorage.removeItem(CLAVE_AVISO)
  return aviso
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cp_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status: number | undefined = error.response?.status
    const mensaje: string | undefined = error.response?.data?.error
    const url: string | undefined = error.config?.url

    // En el login y el registro, 401 y 403 son respuestas al formulario
    // (credenciales incorrectas, cuenta suspendida): se dejan pasar para que
    // la página muestre el mensaje sin recargarse.
    if (esRutaDeCredenciales(url)) return Promise.reject(error)

    // 401: el token venció o es inválido.
    if (status === 401) {
      cerrarSesionLocal('Tu sesión expiró. Vuelve a ingresar.')
    }

    // 403 por suspensión: el backend revisa en cada request si la cuenta
    // sigue activa. Una sesión abierta antes del baneo se cierra aquí.
    if (status === 403 && mensaje?.startsWith('Tu cuenta ha sido suspendida')) {
      cerrarSesionLocal(mensaje)
    }

    return Promise.reject(error)
  },
)

export default api
