import { expect } from 'chai'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import request from 'supertest'
import app from '../../../../src/app'
import { prismaMock } from '../../../helpers/prisma-mock'
import { autenticarAdmin } from '../../../helpers/fixtures'
import {
  CREDENCIALES_INVALIDAS,
  SESIONES_SIN_PERMISO,
  enviar,
  existeElAdminDeLosTokens,
  type Endpoint,
} from '../helpers/acceso'
import { pedidoReciente, programarEstadisticas } from '../helpers/estadisticas'

/**
 * ESC-29 — Panel de estadísticas · security-testing
 * GET /api/v1/admin/stats
 *
 * El panel resume ingresos y datos de clientes: solo un administrador lo ve,
 * los pedidos recientes salen con lo mínimo (sin dirección ni teléfono) y un
 * fallo de la base no filtra detalles internos en producción.
 */

const RUTA = '/api/v1/admin/stats'
const PANEL: Endpoint = { metodo: 'get', ruta: RUTA }

describe('ESC-29 · Seguridad — panel de estadísticas', () => {
  describe('Autenticación', () => {
    it.each(CREDENCIALES_INVALIDAS)('%s → 401 sin calcular nada', async (_caso, cabecera) => {
      // Arrange
      existeElAdminDeLosTokens()

      // Act
      const res = await enviar(PANEL, cabecera)

      // Assert
      expect(res.status).to.equal(401)
      expect(prismaMock.order.groupBy.mock.calls).to.be.empty
    })
  })

  describe('Autorización', () => {
    it.each(SESIONES_SIN_PERMISO)('%s → 403 sin calcular nada', async (_caso, sesion, mensaje) => {
      // Arrange
      const cabecera = sesion()

      // Act
      const res = await enviar(PANEL, cabecera)

      // Assert
      expect(res.status).to.equal(403)
      expect(res.body.error).to.match(mensaje)
      expect(prismaMock.order.groupBy.mock.calls).to.be.empty
    })
  })

  it('minimización de datos: los pedidos recientes no exponen dirección, teléfono ni userId', async () => {
    // Arrange
    const { token } = autenticarAdmin()
    // La fila trae más de lo necesario, como si la consulta cambiara mañana.
    const fila = {
      ...pedidoReciente(),
      address: 'Calle 10 # 43-25',
      phone: '3001234567',
      userId: 'user-ana',
    }
    programarEstadisticas({ recientes: [fila] })

    // Act
    const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

    // Assert
    const [pedido] = res.body.data.recentOrders
    expect(pedido).to.not.have.any.keys('address', 'phone', 'userId')
    expect(JSON.stringify(res.body)).to.not.include('3001234567')
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

    it('una caída de la base no filtra la cadena de conexión ni el detalle', async () => {
      // Arrange
      const { token } = autenticarAdmin()
      prismaMock.user.count.mockRejectedValue(
        new Error('connect ECONNREFUSED — postgresql://celularpro:clave@db:5432/celularpro'),
      )
      prismaMock.phone.count.mockResolvedValue(0)

      // Act
      const res = await request(app).get(RUTA).set('Authorization', `Bearer ${token}`)

      // Assert
      expect(res.status).to.equal(500)
      expect(res.body).to.deep.equal({ error: 'Error interno del servidor' })
      expect(JSON.stringify(res.body)).to.not.include('postgresql://')
    })
  })
})
