import { describe, expect, it, vi, afterEach } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { prismaMock } from '../helpers/prisma-mock'
import { usuario } from '../helpers/fixtures'

/**
 * Seguridad — fuerza bruta sobre el inicio de sesión.
 *
 * Antes de esta versión, 30 intentos fallidos seguidos respondían 401 y el
 * intento 31 con la contraseña correcta entraba: no había ningún freno.
 */

const LOGIN = '/api/v1/auth/login'

function programarCuenta(email = 'ana@gmail.com') {
  prismaMock.user.findUnique.mockImplementation(async ({ where }: { where: { email?: string } }) =>
    where.email === email ? usuario({ email, password: 'Correcta123' }) : null,
  )
}

async function fallar(veces: number, email = 'ana@gmail.com') {
  const codigos: number[] = []
  for (let i = 0; i < veces; i++) {
    const r = await request(app).post(LOGIN).send({ email, password: `Intento${i}x` })
    codigos.push(r.status)
  }
  return codigos
}

afterEach(() => vi.useRealTimers())

describe('Fuerza bruta — límite de intentos fallidos', () => {
  it('los primeros 5 intentos fallidos responden 401 y el sexto 429', async () => {
    programarCuenta()

    const codigos = await fallar(6)

    expect(codigos).toEqual([401, 401, 401, 401, 401, 429])
  })

  it('el 429 explica cuánto esperar e incluye Retry-After', async () => {
    programarCuenta()
    await fallar(5)

    const r = await request(app).post(LOGIN).send({ email: 'ana@gmail.com', password: 'Otra12345' })

    expect(r.status).toBe(429)
    expect(r.body.error).toMatch(/^Demasiados intentos fallidos\. Intenta de nuevo en 15 minutos\.$/)
    expect(Number(r.headers['retry-after'])).toBeGreaterThan(0)
  })

  it('bloqueada la cuenta, ni siquiera la contraseña correcta entra hasta que pase la ventana', async () => {
    programarCuenta()
    await fallar(5)

    const r = await request(app).post(LOGIN).send({ email: 'ana@gmail.com', password: 'Correcta123' })

    expect(r.status).toBe(429)
  })

  it('un login correcto antes del límite borra los fallos acumulados', async () => {
    programarCuenta()
    await fallar(4)
    await request(app).post(LOGIN).send({ email: 'ana@gmail.com', password: 'Correcta123' }).expect(200)

    expect(await fallar(5)).toEqual([401, 401, 401, 401, 401])
  })

  it('la cuenta bloqueada no afecta a otra cuenta', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    await fallar(5, 'ana@gmail.com')

    const [codigo] = await fallar(1, 'luis@gmail.com')

    expect(codigo).toBe(401)
  })

  it('el correo con mayúsculas cuenta como la misma cuenta', async () => {
    programarCuenta()
    await fallar(3, 'ana@gmail.com')
    await fallar(2, 'ANA@Gmail.com')

    const [codigo] = await fallar(1, ' Ana@gmail.com ')

    expect(codigo).toBe(429)
  })

  it('pasada la ventana de 15 minutos, la cuenta vuelve a poder intentar', async () => {
    programarCuenta()
    await fallar(5)
    // La ventana empieza en el primer fallo; se toma la hora al terminar
    // para quedar con seguridad después de esos 15 minutos.
    const despuesDeFallar = Date.now()

    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(despuesDeFallar + 15 * 60 * 1000 + 1)
    const r = await request(app).post(LOGIN).send({ email: 'ana@gmail.com', password: 'Correcta123' })

    expect(r.status).toBe(200)
  })

  it('más de 50 fallos desde una IP sobre cuentas distintas también se bloquean', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    for (let i = 0; i < 50; i++) await fallar(1, `cuenta${i}@gmail.com`)

    const [codigo] = await fallar(1, 'nueva@gmail.com')

    expect(codigo).toBe(429)
  })
})

describe('Fuerza bruta — IP detrás de un proxy', () => {
  it('por defecto no confía en X-Forwarded-For (no se puede falsificar la IP)', () => {
    expect(app.get('trust proxy')).toBe(false)
  })

  it('con TRUST_PROXY=true toma la IP del primer proxy', async () => {
    vi.stubEnv('TRUST_PROXY', 'true')
    vi.resetModules()
    const { default: appConProxy } = await import('../../src/app')

    expect(appConProxy.get('trust proxy')).toBe(1)
    vi.unstubAllEnvs()
  })
})
