import { expect } from 'chai'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import request from 'supertest'
import app from '../../../../src/app'
import { consultaDe, prismaMock } from '../../../helpers/prisma-mock'
import { celular } from '../../../helpers/fixtures'

/**
 * ESC-13 — Recomendación de productos · security-testing
 * GET /api/v1/phones/:slug/similares   (endpoint público)
 *
 * Al ser público no hay autenticación que probar; lo que se protege es otra
 * cosa: que no se pueda usar para volcar el catálogo, que la entrada del
 * atacante llegue a la base como dato (consulta parametrizada) y no como
 * código, que no refleje la entrada en la respuesta y que un fallo interno no
 * filtre detalles en producción.
 */

const RUTA = (slug: string, query = '') =>
  `/api/v1/phones/${encodeURIComponent(slug)}/similares${query}`

describe('ESC-13 · Seguridad — recomendaciones', () => {
  it('no se puede usar para volcar el catálogo: limit=1000 → 400 sin consultar la base', async () => {
    // Act
    const res = await request(app).get(RUTA('iphone-15-pro', '?limit=1000'))

    // Assert
    expect(res.status).to.equal(400)
    expect(prismaMock.phone.findUnique.mock.calls).to.be.empty
    expect(prismaMock.phone.findMany.mock.calls).to.be.empty
  })

  it('la base nunca lee más de 48 filas, ni con el límite más alto permitido', async () => {
    // Arrange
    prismaMock.phone.findUnique.mockResolvedValue(celular({ slug: 'iphone-15-pro' }))
    prismaMock.phone.findMany.mockResolvedValue([])

    // Act
    await request(app).get(RUTA('iphone-15-pro', '?limit=12'))

    // Assert
    expect(consultaDe(prismaMock.phone.findMany).take).to.be.at.most(48)
  })

  it.each([
    ["' OR 1=1 --", 'inyección SQL'],
    ['../../admin/users', 'recorrido de rutas'],
    ['<script>alert(1)</script>', 'script en el slug'],
    ['{"$ne": null}', 'operador NoSQL'],
  ])('slug %j (%s) → llega a la base como dato literal y responde 404', async (slug) => {
    // Arrange
    prismaMock.phone.findUnique.mockResolvedValue(null)

    // Act
    const res = await request(app).get(RUTA(slug))

    // Assert
    // Prisma recibe el texto tal cual dentro de `where`: la consulta es
    // parametrizada, así que la entrada nunca se interpreta como SQL.
    expect(consultaDe(prismaMock.phone.findUnique)).to.deep.include({ where: { slug } })
    expect(res.status).to.equal(404)
    // Y la respuesta no repite la entrada (sin reflejo para un XSS reflejado).
    expect(res.body).to.deep.equal({ error: 'Celular no encontrado' })
  })

  it('la ficha pública no expone el umbral de reposición ni la descripción interna', async () => {
    // Arrange
    prismaMock.phone.findUnique.mockResolvedValue(celular({ slug: 'base', brand: 'Apple' }))
    prismaMock.phone.findMany.mockResolvedValue([celular({ brand: 'Apple', minStock: 9 })])

    // Act
    const res = await request(app).get(RUTA('base'))

    // Assert
    expect(res.body.data[0]).to.not.have.any.keys('minStock', 'longDesc', 'createdAt', 'updatedAt')
  })

  describe('Fallo interno en producción', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      vi.unstubAllEnvs()
      vi.restoreAllMocks()
    })

    it('un error de la base no filtra la cadena de conexión ni el detalle', async () => {
      // Arrange
      prismaMock.phone.findUnique.mockRejectedValue(
        new Error('Can\'t reach database server at postgresql://celularpro:clave@db:5432'),
      )

      // Act
      const res = await request(app).get(RUTA('iphone-15-pro'))

      // Assert
      expect(res.status).to.equal(500)
      expect(res.body).to.deep.equal({ error: 'Error interno del servidor' })
      expect(JSON.stringify(res.body)).to.not.include('postgresql://')
    })
  })
})
