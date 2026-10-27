import { afterEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import app from '../../src/app'

/**
 * Cabeceras de seguridad (criterio 2). Antes solo se quitaba X-Powered-By;
 * ahora helmet agrega las cabeceras estándar, las respuestas de la API no se
 * guardan en caché y CORS no mezcla '*' con credenciales.
 */

describe('Seguridad — cabeceras HTTP', () => {
  it.each([
    ['GET', '/health'],
    ['GET', '/api/v1/ruta-que-no-existe'],
    ['POST', '/api/v1/auth/login'],
  ])('%s %s lleva las cabeceras de helmet y no anuncia el framework', async (metodo, ruta) => {
    const res = metodo === 'GET' ? await request(app).get(ruta) : await request(app).post(ruta).send({})

    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN')
    expect(res.headers['strict-transport-security']).toMatch(/max-age=\d+/)
    expect(res.headers['referrer-policy']).toBe('no-referrer')
    expect(res.headers['content-security-policy']).toContain("default-src 'self'")
    expect(res.headers).not.toHaveProperty('x-powered-by')
  })

  it('las respuestas de la API (también los errores) llevan Cache-Control: no-store', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({})
    const inexistente = await request(app).get('/api/v1/ruta-que-no-existe')

    expect(login.status).toBe(400)
    expect(login.headers['cache-control']).toBe('no-store')
    expect(inexistente.headers['cache-control']).toBe('no-store')
  })

  it('/health queda fuera de /api/v1 y no fuerza no-store', async () => {
    const res = await request(app).get('/health')

    expect(res.status).toBe(200)
    expect(res.headers['cache-control']).not.toBe('no-store')
  })
})

describe('Seguridad — CORS', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('sin FRONTEND_URL: cualquier origen, pero SIN credenciales', async () => {
    vi.stubEnv('FRONTEND_URL', '')
    vi.resetModules()
    const { default: appSinOrigen } = await import('../../src/app')

    const res = await request(appSinOrigen).get('/health').set('Origin', 'https://cualquiera.example')

    expect(res.headers['access-control-allow-origin']).toBe('*')
    expect(res.headers).not.toHaveProperty('access-control-allow-credentials')
  })

  it('con FRONTEND_URL: solo ese origen, con credenciales', async () => {
    vi.stubEnv('FRONTEND_URL', 'https://celularpro.example')
    vi.resetModules()
    const { default: appConOrigen } = await import('../../src/app')

    const res = await request(appConOrigen).get('/health').set('Origin', 'https://celularpro.example')

    expect(res.headers['access-control-allow-origin']).toBe('https://celularpro.example')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })
})
