import { describe, it, expect, beforeEach } from 'vitest'
import api, { consumirAvisoDeSesion } from '../../../src/services/api'

// Basado en: services/api.ts — interceptor de respuesta de Axios

function getResponseErrorHandler() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlers = (api.interceptors.response as any).handlers
  return handlers[0].rejected as (error: unknown) => Promise<unknown>
}

function errorHttp(status: number, url: string, mensaje?: string) {
  return { response: { status, data: mensaje ? { error: mensaje } : {} }, config: { url } }
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem('cp_token', 'fake-token')
  localStorage.setItem('cp_user', JSON.stringify({ id: '1' }))
  delete (window as unknown as { location?: unknown }).location
  // @ts-expect-error - simplificación para el test
  window.location = { href: '' }
})

describe('interceptor de respuesta — sesión vencida (401)', () => {
  it('propaga el error sin tocar la sesión si el status no es 401 ni 403', async () => {
    const error = errorHttp(500, '/phones')

    await expect(getResponseErrorHandler()(error)).rejects.toBe(error)
    expect(localStorage.getItem('cp_token')).toBe('fake-token')
    expect(window.location.href).toBe('')
  })

  it('un 401 en una ruta protegida limpia la sesión, deja un aviso y redirige a /login', async () => {
    const error = errorHttp(401, '/orders/my', 'Token inválido o expirado')

    await expect(getResponseErrorHandler()(error)).rejects.toBe(error)
    expect(localStorage.getItem('cp_token')).toBeNull()
    expect(localStorage.getItem('cp_user')).toBeNull()
    expect(window.location.href).toBe('/login')
    expect(consumirAvisoDeSesion()).toBe('Tu sesión expiró. Vuelve a ingresar.')
  })
})

describe('interceptor de respuesta — credenciales incorrectas', () => {
  // Antes: el 401 del login recargaba la página y el mensaje se perdía.
  it.each(['/auth/login', '/auth/register'])(
    'un 401 en %s NO redirige: el formulario muestra el error',
    async (url) => {
      const error = errorHttp(401, url, 'Credenciales inválidas')

      await expect(getResponseErrorHandler()(error)).rejects.toBe(error)
      expect(window.location.href).toBe('')
      expect(localStorage.getItem('cp_token')).toBe('fake-token')
    },
  )
})

describe('interceptor de respuesta — cuenta suspendida (403)', () => {
  it('cierra la sesión y guarda el motivo para mostrarlo en /login', async () => {
    const mensaje = 'Tu cuenta ha sido suspendida. Motivo: fraude'
    const error = errorHttp(403, '/orders/my', mensaje)

    await expect(getResponseErrorHandler()(error)).rejects.toBe(error)
    expect(localStorage.getItem('cp_token')).toBeNull()
    expect(window.location.href).toBe('/login')
    expect(consumirAvisoDeSesion()).toBe(mensaje)
  })

  // Encontrado por la E2E "Una cuenta suspendida no puede ingresar": el 403
  // del propio login recargaba la página en vez de mostrar el motivo.
  it('un 403 de suspensión en /auth/login no recarga: el formulario muestra el motivo', async () => {
    const error = errorHttp(403, '/auth/login', 'Tu cuenta ha sido suspendida. Motivo: fraude')

    await expect(getResponseErrorHandler()(error)).rejects.toBe(error)
    expect(window.location.href).toBe('')
    expect(consumirAvisoDeSesion()).toBeNull()
  })

  it('un 403 por falta de rol (no suspensión) no cierra la sesión', async () => {
    const error = errorHttp(403, '/admin/stats', 'Acceso restringido a administradores')

    await expect(getResponseErrorHandler()(error)).rejects.toBe(error)
    expect(localStorage.getItem('cp_token')).toBe('fake-token')
    expect(window.location.href).toBe('')
  })
})

describe('consumirAvisoDeSesion', () => {
  it('devuelve el aviso una sola vez', () => {
    sessionStorage.setItem('cp_auth_notice', 'aviso')
    expect(consumirAvisoDeSesion()).toBe('aviso')
    expect(consumirAvisoDeSesion()).toBeNull()
  })
})
