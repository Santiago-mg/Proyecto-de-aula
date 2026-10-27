import { describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { prismaMock } from '../helpers/prisma-mock'
import { autenticar, generarToken, usuario, usuarioConConteo } from '../helpers/fixtures'

/**
 * Pruebas de seguridad (estilo security-testing de RegressionTesting) sobre
 * las seis funcionalidades: registro, inicio de sesión, gestión de perfil,
 * validación de credenciales, control de roles y alertas de stock.
 *
 * No reemplazan un análisis OWASP: fijan como regresión las protecciones que
 * el proyecto ya decidió tener, para que un cambio futuro no las quite.
 */

const REGISTRO = '/api/v1/auth/register'
const LOGIN = '/api/v1/auth/login'

describe('Registro — asignación masiva', () => {
  it('un body con role: ADMIN crea igualmente un USER', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockImplementation(async ({ data }: { data: object }) => ({
      ...usuario(),
      ...data,
    }))

    const res = await request(app).post(REGISTRO).send({
      email: 'ana@gmail.com',
      name: 'Ana',
      password: 'Password123',
      role: 'ADMIN',
      banned: false,
    })

    expect(res.status).toBe(201)
    expect(prismaMock.user.create.mock.calls[0][0].data).not.toHaveProperty('role')
    expect(res.body.data.user.role).toBe('USER')
  })

  it('la contraseña se guarda hasheada', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue(usuario())

    await request(app)
      .post(REGISTRO)
      .send({ email: 'ana@gmail.com', name: 'Ana', password: 'Password123' })

    expect(prismaMock.user.create.mock.calls[0][0].data.password).toBe('hash:Password123')
  })
})

describe('Ninguna respuesta expone la contraseña', () => {
  it.each([
    ['registro', 'post', REGISTRO],
    ['login', 'post', LOGIN],
    ['perfil', 'get', '/api/v1/auth/me'],
  ] as const)('%s', async (_caso, metodo, ruta) => {
    const u = usuario({ email: 'ana@gmail.com', password: 'Password123' })
    prismaMock.user.findUnique.mockImplementation(async ({ where }: { where: { email?: string } }) =>
      metodo === 'post' && ruta === REGISTRO && where.email ? null : u,
    )
    prismaMock.user.create.mockResolvedValue(u)

    const res = await request(app)
      [metodo](ruta)
      .set('Authorization', `Bearer ${generarToken(u)}`)
      .send({ email: 'ana@gmail.com', name: 'Ana', password: 'Password123' })

    expect(res.status).toBeLessThan(300)
    expect(JSON.stringify(res.body)).not.toContain('hash:Password123')
    expect(JSON.stringify(res.body)).not.toContain('"password"')
  })
})

describe('Control de roles — el rol se lee de la base, no del token', () => {
  it('un token que dice ADMIN de un usuario que hoy es USER → 403 en /admin', async () => {
    const hoyUser = usuario({ role: 'USER' })
    prismaMock.user.findUnique.mockResolvedValue(hoyUser)
    const tokenViejo = generarToken({ id: hoyUser.id, role: 'ADMIN' })

    const res = await request(app)
      .get('/api/v1/admin/alerts')
      .set('Authorization', `Bearer ${tokenViejo}`)

    expect(res.status).toBe(403)
    expect(prismaMock.alert.findMany).not.toHaveBeenCalled()
  })

  it.each([
    ['GET', '/api/v1/admin/stats'],
    ['GET', '/api/v1/admin/users'],
    ['GET', '/api/v1/admin/alerts'],
    ['PUT', '/api/v1/admin/users/x/role'],
    ['PUT', '/api/v1/admin/users/x/ban'],
  ])('un USER no accede a %s %s', async (metodo, ruta) => {
    const { token } = autenticar({ role: 'USER' })

    const res = await request(app)
      [metodo.toLowerCase() as 'get' | 'put'](ruta)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'ADMIN', reason: 'motivo' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Acceso restringido a administradores')
  })

  it('un token con algoritmo "none" (sin firma) se rechaza', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ id: 'x', role: 'ADMIN' })).toString('base64url')

    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${header}.${payload}.`)

    expect(res.status).toBe(401)
  })

  it('un admin no puede quitarse a sí mismo el rol', async () => {
    const { user, token } = autenticar({ role: 'ADMIN' })
    prismaMock.user.update.mockResolvedValue(usuarioConConteo())

    const res = await request(app)
      .put(`/api/v1/admin/users/${user.id}/role`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'USER' })

    expect(res.status).toBe(400)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })
})

describe('Cabeceras y errores', () => {
  it('no anuncia el framework (X-Powered-By)', async () => {
    const res = await request(app).get('/health')
    expect(res.headers['x-powered-by']).toBeUndefined()
  })

  it('un body JSON malformado en el login no devuelve 500', async () => {
    const res = await request(app)
      .post(LOGIN)
      .set('Content-Type', 'application/json')
      .send('{"email": "ana@gmail.com", ')

    expect(res.status).toBeLessThan(500)
  })
})

describe('Errores del cliente al enviar el cuerpo', () => {
  it('JSON malformado → 400 con un mensaje claro y sin detalle interno', async () => {
    const res = await request(app)
      .post(LOGIN)
      .set('Content-Type', 'application/json')
      .send('{"email": ')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'El cuerpo de la petición no es un JSON válido' })
  })

  it('un cuerpo de más de 100 kB → 413, no 500', async () => {
    const res = await request(app)
      .post(REGISTRO)
      .send({ email: 'ana@gmail.com', name: 'x'.repeat(150_000), password: 'Password123' })

    expect(res.status).toBe(413)
    expect(res.body).toEqual({ error: 'Petición inválida' })
  })
})
