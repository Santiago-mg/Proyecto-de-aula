import { expect } from 'chai'
import { describe, it } from 'vitest'
import request from 'supertest'
import app from '../../../../src/app'
import { consultaDe, prismaMock } from '../../../helpers/prisma-mock'
import {
  autenticarAdmin,
  bodyCelularValido,
  celular,
} from '../../../helpers/fixtures'

/**
 * ESC-30 — Administración del catálogo · regression-testing
 * POST / PUT / DELETE /api/v1/phones
 *
 * Lo que el panel espera al crear y editar: valores por defecto, que una
 * edición parcial no borre lo que no se envió, el orden de las
 * características y la sincronización con las alertas de inventario. Al final,
 * los defectos ya corregidos.
 */

const RUTA = '/api/v1/phones'

describe('ESC-30 · Regresión — administración del catálogo', () => {
  describe('Crear', () => {
    it('los campos opcionales que no llegan se guardan como null', async () => {
      // Arrange
      const { token } = autenticarAdmin()
      prismaMock.phone.findUnique.mockResolvedValue(null)
      prismaMock.phone.create.mockResolvedValue(celular())

      // Act
      await request(app).post(RUTA).set('Authorization', `Bearer ${token}`).send(bodyCelularValido())

      // Assert
      expect(consultaDe(prismaMock.phone.create).data).to.include({
        compareAt: null, badge: null, batteryHealth: null, ram: null, storage: null,
        camera: null, battery: null, screen: null, chip: null, shortDesc: null,
        longDesc: null, heroImage: null,
      })
    })

    it('aplica los valores por defecto: minStock 5, sin verificar y sin relaciones', async () => {
      // Arrange
      const { token } = autenticarAdmin()
      prismaMock.phone.findUnique.mockResolvedValue(null)
      prismaMock.phone.create.mockResolvedValue(celular())

      // Act
      await request(app).post(RUTA).set('Authorization', `Bearer ${token}`).send(bodyCelularValido())

      // Assert
      const { data } = consultaDe(prismaMock.phone.create) as { data: Record<string, unknown> }
      expect(data).to.include({ minStock: 5, verified: false })
      expect(data.images).to.deep.equal({ create: [] })
      expect(data.colors).to.deep.equal({ create: [] })
      expect(data.features).to.deep.equal({ create: [] })
    })

    it('las características se guardan con su posición, en el orden en que llegaron', async () => {
      // Arrange
      const { token } = autenticarAdmin()
      prismaMock.phone.findUnique.mockResolvedValue(null)
      prismaMock.phone.create.mockResolvedValue(celular())

      // Act
      await request(app)
        .post(RUTA)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyCelularValido({ features: ['Face ID', 'USB-C', 'eSIM'] }))

      // Assert
      expect(consultaDe(prismaMock.phone.create).data).to.deep.include({
        features: {
          create: [
            { feature: 'Face ID', position: 0 },
            { feature: 'USB-C', position: 1 },
            { feature: 'eSIM', position: 2 },
          ],
        },
      })
    })

    it('dar de alta un celular agotado abre su alerta OUT_OF_STOCK', async () => {
      // Arrange
      const { token } = autenticarAdmin()
      prismaMock.phone.findUnique.mockResolvedValue(null)
      prismaMock.phone.create.mockResolvedValue(celular({ name: 'Moto G84', stock: 0, minStock: 2 }))

      // Act
      await request(app).post(RUTA).set('Authorization', `Bearer ${token}`).send(bodyCelularValido({ stock: 0 }))

      // Assert
      expect(consultaDe(prismaMock.alert.upsert).create).to.deep.include({
        type: 'OUT_OF_STOCK',
        message: '"Moto G84" se quedó sin unidades.',
      })
    })
  })

  describe('Editar', () => {
    it('una edición parcial solo escribe lo que llegó: no resetea minStock ni borra fotos', async () => {
      // Arrange
      const { token } = autenticarAdmin()
      const existente = celular({ minStock: 8 })
      prismaMock.phone.findUnique.mockResolvedValue(existente)
      prismaMock.phone.update.mockResolvedValue(existente)

      // Act
      await request(app).put(`${RUTA}/${existente.id}`).set('Authorization', `Bearer ${token}`).send({ price: 2_000_000 })

      // Assert
      // Si el esquema parcial aplicara los default de la creación, cada
      // edición devolvería minStock a 5 y vaciaría fotos, colores y
      // características sin que nadie lo pidiera.
      expect(consultaDe(prismaMock.phone.update).data).to.deep.equal({ price: 2_000_000 })
    })

    it('enviar fotos nuevas reemplaza las anteriores', async () => {
      // Arrange
      const { token } = autenticarAdmin()
      const existente = celular()
      prismaMock.phone.findUnique.mockResolvedValue(existente)
      prismaMock.phone.update.mockResolvedValue(existente)
      const foto = { url: 'https://cdn.celularpro.co/nueva.jpg', position: 0 }

      // Act
      await request(app).put(`${RUTA}/${existente.id}`).set('Authorization', `Bearer ${token}`).send({ images: [foto] })

      // Assert
      expect(consultaDe(prismaMock.phone.update).data).to.deep.equal({
        images: { deleteMany: {}, create: [foto] },
      })
    })

    it('reponer stock cierra las alertas abiertas y no abre ninguna nueva', async () => {
      // Arrange
      const { token } = autenticarAdmin()
      const existente = celular({ stock: 0, minStock: 5 })
      prismaMock.phone.findUnique.mockResolvedValue(existente)
      prismaMock.phone.update.mockResolvedValue({ ...existente, stock: 20 })

      // Act
      await request(app).put(`${RUTA}/${existente.id}`).set('Authorization', `Bearer ${token}`).send({ stock: 20 })

      // Assert
      expect(consultaDe(prismaMock.alert.updateMany)).to.deep.equal({
        where: { phoneId: existente.id, isResolved: false },
        data: { isResolved: true },
      })
      expect(prismaMock.alert.upsert.mock.calls).to.be.empty
    })
  })

  describe('Eliminar', () => {
    it('borra por id y responde 204', async () => {
      // Arrange
      const { token } = autenticarAdmin()
      const existente = celular()
      prismaMock.phone.findUnique.mockResolvedValue(existente)
      prismaMock.phone.delete.mockResolvedValue(existente)

      // Act
      const res = await request(app).delete(`${RUTA}/${existente.id}`).set('Authorization', `Bearer ${token}`)

      // Assert
      expect(res.status).to.equal(204)
      expect(prismaMock.phone.delete.mock.calls).to.deep.equal([[{ where: { id: existente.id } }]])
    })
  })

  describe('Defectos corregidos: no deben volver', () => {
    it('DEF-30-01 — un slug repetido respondía 500 con la ruta interna del repositorio; ahora 409 limpio', async () => {
      // Arrange
      const { token } = autenticarAdmin()
      prismaMock.phone.findUnique.mockResolvedValue(celular({ slug: 'iphone-15' }))

      // Act
      const res = await request(app).post(RUTA).set('Authorization', `Bearer ${token}`).send(bodyCelularValido({ slug: 'iphone-15' }))

      // Assert
      expect(res.status).to.equal(409)
      expect(res.body).to.deep.equal({ error: 'Ya existe un celular con ese slug' })
      expect(prismaMock.phone.create.mock.calls).to.be.empty
    })

    it('la ruta del formulario de edición (GET /phones/id/:id) era pública; ahora exige sesión', async () => {
      // Act
      const res = await request(app).get(`${RUTA}/id/cualquier-id`)

      // Assert
      expect(res.status).to.equal(401)
      expect(prismaMock.phone.findUnique.mock.calls).to.be.empty
    })
  })
})
