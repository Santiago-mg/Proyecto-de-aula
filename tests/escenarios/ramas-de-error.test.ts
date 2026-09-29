import { expect } from 'chai'
import { afterEach, describe, it, vi } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { prismaMock } from '../helpers/prisma-mock'
import {
  ID_INEXISTENTE,
  autenticar,
  autenticarAdmin,
  celular,
  errorRegistroNoEncontrado,
  usuarioConConteo,
} from '../helpers/fixtures'

/**
 * Ramas que los caminos felices no recorren: fallos de infraestructura,
 * cambio de rol, y el desglose por estado del panel.
 *
 * Los errores inesperados se registran en consola a propósito (error.middleware
 * loggea antes de responder), así que se silencia la salida para que el
 * reporte de la suite quede limpio.
 */

afterEach(() => {
  vi.restoreAllMocks()
})

function silenciarConsola() {
  vi.spyOn(console, 'error').mockImplementation(() => {})
}

describe('Cambio de rol — PUT /admin/users/:id/role', () => {
  const RUTA = (id: string) => `/api/v1/admin/users/${id}/role`

  it('rol USER → 403', async () => {
    // Arrange
    const { token } = autenticar()

    // Act
    const res = await request(app)
      .put(RUTA(ID_INEXISTENTE))
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'ADMIN' })

    // Assert
    expect(res.status).to.equal(403)
  })

  it('rol inválido → 400 Datos inválidos', async () => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    const res = await request(app)
      .put(RUTA(ID_INEXISTENTE))
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'SUPERADMIN' })

    // Assert
    expect(res.status).to.equal(400)
    expect(res.body.error).to.equal('Datos inválidos')
  })

  it('un admin no puede cambiar su propio rol → 400', async () => {
    // Arrange
    const { user, token } = autenticarAdmin()

    // Act
    const res = await request(app)
      .put(RUTA(user.id))
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'USER' })

    // Assert
    expect(res.status).to.equal(400)
    expect(res.body.error).to.equal('No puedes cambiar tu propio rol')
    expect(prismaMock.user.update.mock.calls).to.be.empty
  })

  it('cambia el rol de otro usuario → 200', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const otro = usuarioConConteo({ role: 'USER' })
    prismaMock.user.update.mockResolvedValue({ ...otro, role: 'ADMIN' })

    // Act
    const res = await request(app)
      .put(RUTA(otro.id))
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'ADMIN' })

    // Assert
    expect(res.status).to.equal(200)
    expect(res.body.data.role).to.equal('ADMIN')
  })

  it('el id no existe → 404', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockRejectedValue(errorRegistroNoEncontrado())

    // Act
    const res = await request(app)
      .put(RUTA(ID_INEXISTENTE))
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'ADMIN' })

    // Assert
    expect(res.status).to.equal(404)
  })
})

describe('Fallos inesperados de la capa de datos', () => {
  it('un error de base de datos sale como 500, sin filtrar la consulta', async () => {
    // Arrange
    silenciarConsola()
    const { token } = autenticarAdmin()
    prismaMock.user.count.mockRejectedValue(
      new Error('connection refused: 127.0.0.1:5432'),
    )

    // Act
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(500)
    expect(res.body.error).to.equal('Error interno del servidor')
  })

  it('si la base falla al releer el usuario del token, responde 500 y no 401', async () => {
    // Arrange
    silenciarConsola()
    const { token } = autenticar()
    // El middleware consulta la fila vigente en cada request; si esa consulta
    // se cae, es un fallo del servidor, no un token inválido.
    prismaMock.user.findUnique.mockRejectedValue(new Error('socket hang up'))

    // Act
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(500)
  })

  it('un update que falla por otra razón distinta de P2025 no se convierte en 404', async () => {
    // Arrange
    silenciarConsola()
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockRejectedValue(new Error('deadlock detected'))

    // Act
    const res = await request(app)
      .put(`/api/v1/admin/users/${ID_INEXISTENTE}/ban`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'motivo de prueba' })

    // Assert
    expect(res.status).to.equal(500)
  })
})

describe('Actualización de celular con relaciones', () => {
  it('reemplaza imágenes, colores y características cuando vienen en el body', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const existente = celular()
    prismaMock.phone.findUnique.mockResolvedValue(existente)
    prismaMock.phone.update.mockResolvedValue(existente)

    // Act
    const res = await request(app)
      .put(`/api/v1/phones/${existente.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        images: [{ url: 'https://ejemplo.com/foto.jpg', position: 0 }],
        colors: [{ colorId: 'c1', name: 'Negro', hex: '#000000' }],
        features: ['Face ID'],
      })

    // Assert
    // Las tres relaciones se borran y se vuelven a crear en la misma escritura.
    expect(res.status).to.equal(200)
    const dataEnviada = prismaMock.phone.update.mock.calls[0][0].data
    expect(dataEnviada.images).to.deep.include({ deleteMany: {} })
    expect(dataEnviada.colors).to.deep.include({ deleteMany: {} })
    expect(dataEnviada.features).to.deep.include({ deleteMany: {} })
  })

  it('sin relaciones en el body, no las toca', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const existente = celular()
    prismaMock.phone.findUnique.mockResolvedValue(existente)
    prismaMock.phone.update.mockResolvedValue(existente)

    // Act
    await request(app)
      .put(`/api/v1/phones/${existente.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 999_000 })

    // Assert
    const dataEnviada = prismaMock.phone.update.mock.calls[0][0].data
    expect(dataEnviada).to.not.have.property('images')
    expect(dataEnviada).to.not.have.property('colors')
    expect(dataEnviada).to.not.have.property('features')
  })
})

describe('Panel — pedidos recientes', () => {
  it('mapea los pedidos recientes con su número de artículos', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.count.mockResolvedValue(0)
    prismaMock.phone.count.mockResolvedValue(0)
    prismaMock.order.groupBy.mockResolvedValue([])
    prismaMock.order.aggregate.mockResolvedValue({ _sum: { total: 0 } })
    prismaMock.order.findMany.mockResolvedValueOnce([
      {
        id: 'p1',
        orderRef: 'CP-ABC123',
        email: 'ana@test.com',
        name: 'Ana Garcia',
        total: 120_000,
        status: 'CONFIRMED',
        createdAt: new Date(),
        _count: { items: 3 },
      },
    ])
    prismaMock.order.findMany.mockResolvedValueOnce([])

    // Act
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(200)
    expect(res.body.data.recentOrders[0]).to.deep.include({
      orderRef: 'CP-ABC123',
      itemCount: 3,
    })
  })
})
