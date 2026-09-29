import { expect } from 'chai'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { consultaDe, prismaMock } from '../helpers/prisma-mock'
import {
  ID_INEXISTENTE,
  autenticar,
  celular,
  favorito,
  tokenConFirmaInvalida,
} from '../helpers/fixtures'

/**
 * ESC-32 — Lista de favoritos
 * GET / POST / DELETE /api/v1/favorites
 *
 * A diferencia del resto de escenarios, estas rutas solo exigen estar
 * autenticado: no hay requireAdmin. El usuario sale del token, así que nadie
 * puede leer ni tocar la lista de otro.
 */

const LISTA = '/api/v1/favorites'
const ITEM = (phoneId: string) => `${LISTA}/${phoneId}`

const PHONE_ID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301'

describe('Acceso a la lista', () => {
  it('Camino 1: sin cabecera Bearer → 401 Token requerido', async () => {
    // Act
    const res = await request(app).get(LISTA)

    // Assert
    expect(res.status).to.equal(401)
    expect(res.body.error).to.equal('Token requerido')
    expect(prismaMock.favorite.findMany.mock.calls).to.be.empty
  })

  it('Camino 2: firma inválida → 401 Token inválido o expirado', async () => {
    // Act
    const res = await request(app)
      .get(LISTA)
      .set('Authorization', `Bearer ${tokenConFirmaInvalida()}`)

    // Assert
    expect(res.status).to.equal(401)
    expect(res.body.error).to.equal('Token inválido o expirado')
  })

  it('no hace falta ser administrador: un usuario corriente entra', async () => {
    // Arrange
    const { token } = autenticar()
    prismaMock.favorite.findMany.mockResolvedValue([])

    // Act
    const res = await request(app)
      .get(LISTA)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(200)
  })
})

describe('Camino 3: agregar un celular a favoritos', () => {
  it('con un celular que existe → 201 y queda marcado', async () => {
    // Arrange
    const { user, token } = autenticar()
    prismaMock.phone.findUnique.mockResolvedValue(celular({ id: PHONE_ID }))

    // Act
    const res = await request(app)
      .post(ITEM(PHONE_ID))
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(201)
    expect(res.body.data).to.deep.equal({ phoneId: PHONE_ID, favorited: true })
    expect(prismaMock.favorite.upsert.mock.calls).to.deep.include([{
      where: { userId_phoneId: { userId: user.id, phoneId: PHONE_ID } },
      update: {},
      create: { userId: user.id, phoneId: PHONE_ID },
    }])
  })

  it('Camino 4: el id de la URL no es un UUID → 400 Datos inválidos', async () => {
    // Arrange
    const { token } = autenticar()

    // Act
    const res = await request(app)
      .post(ITEM('no-es-un-uuid'))
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(400)
    expect(res.body.error).to.equal('Datos inválidos')
    // Ni siquiera se consulta el catálogo: la guarda corta antes.
    expect(prismaMock.phone.findUnique.mock.calls).to.be.empty
    expect(prismaMock.favorite.upsert.mock.calls).to.be.empty
  })

  it('Camino 5: UUID bien formado pero que no existe → 404 Celular no encontrado', async () => {
    // Arrange
    const { token } = autenticar()
    prismaMock.phone.findUnique.mockResolvedValue(null)

    // Act
    const res = await request(app)
      .post(ITEM(ID_INEXISTENTE))
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(404)
    expect(res.body.error).to.equal('Celular no encontrado')
    // Lo importante: no se escribe una fila que la clave foránea rechazaría.
    expect(prismaMock.favorite.upsert.mock.calls).to.be.empty
  })

  it('Camino 6: marcarlo dos veces no lo duplica (upsert, no create)', async () => {
    // Arrange
    const { token } = autenticar()
    prismaMock.phone.findUnique.mockResolvedValue(celular({ id: PHONE_ID }))

    await request(app).post(ITEM(PHONE_ID)).set('Authorization', `Bearer ${token}`)

    // Act
    const segunda = await request(app)
      .post(ITEM(PHONE_ID))
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(segunda.status).to.equal(201)
    // El upsert deja la fila como está si ya existía: nunca se usa create
    // directo, que es lo que chocaría contra el unique (userId, phoneId).
    expect(prismaMock.favorite.upsert.mock.calls).to.have.lengthOf(2)
    expect(prismaMock.favorite.create.mock.calls).to.be.empty
  })
})

describe('Camino 7 y 8: quitar de favoritos', () => {
  it('quitar uno que estaba marcado → 204 sin cuerpo', async () => {
    // Arrange
    const { user, token } = autenticar()
    prismaMock.favorite.deleteMany.mockResolvedValue({ count: 1 })

    // Act
    const res = await request(app)
      .delete(ITEM(PHONE_ID))
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(204)
    expect(res.body).to.deep.equal({})
    expect(prismaMock.favorite.deleteMany.mock.calls).to.deep.include([{
      where: { userId: user.id, phoneId: PHONE_ID },
    }])
  })

  it('quitar algo que nunca estuvo marcado → 204 igual, no es un error', async () => {
    // Arrange
    const { token } = autenticar()
    prismaMock.favorite.deleteMany.mockResolvedValue({ count: 0 })

    // Act
    const res = await request(app)
      .delete(ITEM(PHONE_ID))
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(204)
  })

  it('el id de la URL también se valida al quitar → 400', async () => {
    // Arrange
    const { token } = autenticar()

    // Act
    const res = await request(app)
      .delete(ITEM('tampoco-es-uuid'))
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(400)
    expect(prismaMock.favorite.deleteMany.mock.calls).to.be.empty
  })
})

describe('Camino 9: consultar la lista', () => {
  it('sin favoritos → 200 con lista vacía', async () => {
    // Arrange
    const { token } = autenticar()
    prismaMock.favorite.findMany.mockResolvedValue([])

    // Act
    const res = await request(app)
      .get(LISTA)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(200)
    expect(res.body.data).to.be.an('array').that.is.empty
  })

  it('devuelve el celular completo, con la misma forma que el catálogo', async () => {
    // Arrange
    const { token } = autenticar()
    const phone = celular({ id: PHONE_ID, name: 'iPhone 13', stock: 4 })
    prismaMock.favorite.findMany.mockResolvedValue([favorito({ celular: phone })])

    // Act
    const res = await request(app)
      .get(LISTA)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(200)
    expect(res.body.data).to.have.lengthOf(1)
    expect(res.body.data[0]).to.deep.include({
      id: PHONE_ID,
      name: 'iPhone 13',
      stock: 4,
      // Campos que el compañero perdía al devolver la fila cruda de Prisma.
      images: [],
      colors: [],
      features: [],
    })
  })

  it('solo consulta los del usuario del token, nunca los de otro', async () => {
    // Arrange
    const { user, token } = autenticar()
    prismaMock.favorite.findMany.mockResolvedValue([])

    // Act
    await request(app).get(LISTA).set('Authorization', `Bearer ${token}`)

    // Assert
    expect(consultaDe(prismaMock.favorite.findMany)).to.deep.include({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
  })

  it('las características vuelven como texto plano, no como filas', async () => {
    // Arrange
    const { token } = autenticar()
    const phone = {
      ...celular({ id: PHONE_ID }),
      features: [
        { id: 1, phoneId: PHONE_ID, feature: 'Carga rápida', position: 0 },
        { id: 2, phoneId: PHONE_ID, feature: 'Resistente al agua', position: 1 },
      ],
    }
    prismaMock.favorite.findMany.mockResolvedValue([
      favorito({ celular: phone as ReturnType<typeof celular> }),
    ])

    // Act
    const res = await request(app)
      .get(LISTA)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.body.data[0].features).to.deep.equal([
      'Carga rápida',
      'Resistente al agua',
    ])
  })
})

describe('Fallos de infraestructura', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('si la consulta de la lista se cae → 500', async () => {
    // Arrange
    const { token } = autenticar()
    prismaMock.favorite.findMany.mockRejectedValue(new Error('timeout'))

    // Act
    const res = await request(app)
      .get(LISTA)
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(500)
  })

  it('si falla la escritura del favorito → 500', async () => {
    // Arrange
    const { token } = autenticar()
    prismaMock.phone.findUnique.mockResolvedValue(celular({ id: PHONE_ID }))
    prismaMock.favorite.upsert.mockRejectedValue(new Error('deadlock detected'))

    // Act
    const res = await request(app)
      .post(ITEM(PHONE_ID))
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(500)
  })

  it('si falla el borrado → 500', async () => {
    // Arrange
    const { token } = autenticar()
    prismaMock.favorite.deleteMany.mockRejectedValue(new Error('timeout'))

    // Act
    const res = await request(app)
      .delete(ITEM(PHONE_ID))
      .set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(500)
  })
})
