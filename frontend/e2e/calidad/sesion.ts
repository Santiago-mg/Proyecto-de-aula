import type { Browser, BrowserContext } from 'playwright'
import { API_URL, FRONT_URL } from '../support/config'

/** Abre un contexto con la sesión ya iniciada (token en localStorage). */
export async function contextoConSesion(
  browser: Browser,
  rol: 'anonimo' | 'cliente' | 'admin',
  opciones: Parameters<Browser['newContext']>[0] = {},
): Promise<BrowserContext> {
  const contexto = await browser.newContext({ baseURL: FRONT_URL, ...opciones })
  if (rol === 'anonimo') return contexto

  const api = API_URL.replace(/\/$/, '')
  let credenciales = { email: 'admin@celularpro.co', password: 'admin1234' }
  if (rol === 'cliente') {
    credenciales = { email: `calidad.${Date.now()}@gmail.com`, password: 'Segura123' }
    await fetch(`${api}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...credenciales, name: 'Carla Rojas' }),
    })
  }
  const res = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credenciales),
  })
  const { data } = (await res.json()) as { data: { token: string; user: unknown } }
  await contexto.addInitScript(
    ([token, user]) => {
      localStorage.setItem('cp_token', token as string)
      localStorage.setItem('cp_user', JSON.stringify(user))
    },
    [data.token, data.user],
  )
  return contexto
}

/** Pantallas que se evalúan, con el rol que hace falta para verlas. */
export const PANTALLAS: Array<{ ruta: string; nombre: string; rol: 'anonimo' | 'cliente' | 'admin'; espera: string }> = [
  { ruta: '/', nombre: 'Inicio', rol: 'anonimo', espera: 'header' },
  { ruta: '/catalog', nombre: 'Catálogo', rol: 'anonimo', espera: 'header' },
  { ruta: '/login', nombre: 'Iniciar sesión', rol: 'anonimo', espera: '#email' },
  { ruta: '/register', nombre: 'Registro', rol: 'anonimo', espera: '#name' },
  { ruta: '/dashboard', nombre: 'Mis pedidos', rol: 'cliente', espera: 'h1' },
  { ruta: '/profile', nombre: 'Mi perfil', rol: 'cliente', espera: '#profile-name' },
  { ruta: '/admin', nombre: 'Panel de administración', rol: 'admin', espera: '[data-alertas-cargadas="true"]' },
  { ruta: '/admin/users', nombre: 'Usuarios (admin)', rol: 'admin', espera: 'table' },
  { ruta: '/admin/phones', nombre: 'Celulares (admin)', rol: 'admin', espera: 'table' },
  { ruta: '/unauthorized', nombre: 'Acceso no autorizado', rol: 'anonimo', espera: 'h1' },
]
