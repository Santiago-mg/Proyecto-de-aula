import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../../../src/app'
import { consultaDe, prismaMock } from '../../../helpers/prisma-mock'
import { autenticarAdmin, usuario, usuarioConConteo } from '../../../helpers/fixtures'
import { AdminRepository } from '../../../../src/infrastructure/repositories/AdminRepository'

/**
 * ESC-28 — Consultar usuarios · regression-testing
 * GET /api/v1/admin/users
 *
 * Lo que el panel espera del listado: cómo busca, en qué orden devuelve, qué
 * valores toma por defecto y cómo cuenta los pedidos de cada usuario.
 */

const RUTA = '/api/v1/admin/users'

describe('ESC-28 · Regresión — consultar usuarios', () => {
  it('sin parámetros pide la página 1 con 20 usuarios', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.count.mockResolvedValue(0)
    prismaMock.user.findMany.mockResolvedValue([])

    // Act
    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.body.meta).to.include({ page: 1, limit: 20 })
    expect(consultaDe(prismaMock.user.findMany)).to.deep.include({ skip: 0, take: 20 })
  })

  it('busca por nombre o por email, sin distinguir mayúsculas', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.count.mockResolvedValue(0)
    prismaMock.user.findMany.mockResolvedValue([])

    // Act
    await request(app).get(`${RUTA}?search=Ana`).set('Authorization', `Bearer ${token}`)

    // Assert
    const where = {
      OR: [
        { name: { contains: 'Ana', mode: 'insensitive' } },
        { email: { contains: 'Ana', mode: 'insensitive' } },
      ],
    }
    // El mismo filtro para contar y para traer la página: si no, totalPages
    // no correspondería a lo que se está mostrando.
    expect(consultaDe(prismaMock.user.findMany)).to.deep.include({ where })
    expect(consultaDe(prismaMock.user.count)).to.deep.equal({ where })
  })

  it('devuelve primero a los usuarios más recientes', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.count.mockResolvedValue(0)
    prismaMock.user.findMany.mockResolvedValue([])

    // Act
    await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    // Assert
    expect(consultaDe(prismaMock.user.findMany)).to.deep.include({ orderBy: { createdAt: 'desc' } })
  })

  it('conserva el orden en que la base devuelve las filas', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    const filas = [
      usuarioConConteo({ name: 'Carla' }),
      usuarioConConteo({ name: 'Ana' }),
      usuarioConConteo({ name: 'Beto' }),
    ]
    prismaMock.user.count.mockResolvedValue(3)
    prismaMock.user.findMany.mockResolvedValue(filas)

    // Act
    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.body.data.map((u: { name: string }) => u.name)).to.deep.equal(['Carla', 'Ana', 'Beto'])
  })

  it('cada usuario trae cuántos pedidos tiene (orderCount)', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    prismaMock.user.count.mockResolvedValue(2)
    prismaMock.user.findMany.mockResolvedValue([
      usuarioConConteo({ orders: 0 }),
      usuarioConConteo({ orders: 12 }),
    ])

    // Act
    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.body.data.map((u: { orderCount: number }) => u.orderCount)).to.deep.equal([0, 12])
    expect(consultaDe(prismaMock.user.findMany)).to.deep.include({
      include: { _count: { select: { orders: true } } },
    })
  })

  it('una fila sin conteo de pedidos se muestra con 0, no con undefined', async () => {
    // Arrange
    prismaMock.user.count.mockResolvedValue(1)
    prismaMock.user.findMany.mockResolvedValue([usuario()])

    // Act
    const { data } = await new AdminRepository().listUsers(1, 20)

    // Assert
    expect(data[0].orderCount).to.equal(0)
  })

  it('protección documentada: una query inválida responde 400, no el ZodError crudo como 500', async () => {
    // Arrange
    const { token } = autenticarAdmin()

    // Act
    // El controlador usa .parse(); el error que lanza lo traduce la red de
    // seguridad de error.middleware.
    const res = await request(app).get(`${RUTA}?limit=cien`).set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(400)
    expect(res.body).to.have.all.keys('error', 'errors')
    expect(res.body).to.not.have.property('detail')
  })
})
