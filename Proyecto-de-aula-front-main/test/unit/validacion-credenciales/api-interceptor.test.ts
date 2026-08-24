import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '../../../src/services/api'

// Basado en: services/api.ts — interceptor de respuesta de Axios

// axios expone los handlers registrados internamente en interceptors.response.handlers
function getResponseErrorHandler() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlers = (api.interceptors.response as any).handlers
  return handlers[0].rejected as (error: unknown) => Promise<unknown>
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('cp_token', 'fake-token')
  localStorage.setItem('cp_user', JSON.stringify({ id: '1' }))
  // jsdom no implementa navigation real; se puede sobreescribir href
  delete (window as unknown as { location?: unknown }).location
  // @ts-expect-error - simplificación para el test
  window.location = { href: '' }
})

describe('interceptor de respuesta ante token inválido (401)', () => {
  // Camino 1,2,3,F — respuesta con status distinto de 401
  it('propaga el error sin tocar la sesión si el status no es 401', async () => {
    const rejected = getResponseErrorHandler()
    const error = { response: { status: 500 } }

    await expect(rejected(error)).rejects.toBe(error)
    expect(localStorage.getItem('cp_token')).toBe('fake-token')
    expect(window.location.href).toBe('')
  })

  // Camino 1,2,4,5,F — respuesta con status 401 (token vencido/inválido)
  it('limpia la sesión local y redirige a /login si el status es 401', async () => {
    const rejected = getResponseErrorHandler()
    const error = { response: { status: 401 } }

    await expect(rejected(error)).rejects.toBe(error)
    expect(localStorage.getItem('cp_token')).toBeNull()
    expect(localStorage.getItem('cp_user')).toBeNull()
    expect(window.location.href).toBe('/login')
  })
})
