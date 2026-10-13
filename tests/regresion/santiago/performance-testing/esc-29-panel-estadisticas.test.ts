import { expect } from 'chai'
import { afterEach, describe, it, vi } from 'vitest'
import request from 'supertest'
import app from '../../../../src/app'
import { prismaMock } from '../../../helpers/prisma-mock'
import { autenticar, autenticarAdmin } from '../../../helpers/fixtures'
import { AdminRepository } from '../../../../src/infrastructure/repositories/AdminRepository'
import {
  baseConLatencia,
  esperar,
  mediana,
  medir,
  repetir,
} from '../helpers/medicion'
import { programarEstadisticas } from '../helpers/estadisticas'

/**
 * ESC-29 — Panel de estadísticas · performance-testing
 * GET /api/v1/admin/stats
 *
 * Es el endpoint más pesado del panel: 11 consultas. Salen en tres tandas
 * con Promise.all (4 de usuarios, 3 de celulares, 3 de pedidos) y una
 * consulta más para los ingresos de los últimos 7 días, que se agrupan en
 * memoria (el comentario del repositorio dice "Antes: 7 queries simultáneos
 * → ahora: 1 query"). Estas pruebas congelan esas optimizaciones.
 */

const PRESUPUESTO_MS = 500
const LATENCIA_BASE_MS = 15
const CONSULTAS_DEL_PANEL = 11
const DIA = 24 * 60 * 60 * 1000

afterEach(() => {
  vi.useRealTimers()
})

describe('ESC-29 · Performance — panel de estadísticas', () => {
  it('el panel produce los indicadores correctos', async () => {
    // Arrange
    programarEstadisticas({
      celulares: { total: 10, conStock: 7 },
      pedidos: [{ status: 'DELIVERED', count: 2, sum: 4_000_000 }],
    })

    // Act
    const stats = await new AdminRepository().getStats()

    // Assert
    expect(stats.phones).to.include({ total: 10, inStock: 7, outOfStock: 3 })
    expect(stats.orders).to.include({ delivered: 2, revenue: 4_000_000 })
  })

  it('un usuario sin permiso se rechaza sin lanzar ninguna de las 11 consultas', async () => {
    // Arrange
    const { token } = autenticar()

    // Act
    const res = await request(app).get('/api/v1/admin/stats').set('Authorization', `Bearer ${token}`)

    // Assert
    expect(res.status).to.equal(403)
    expect(prismaMock.user.count.mock.calls).to.be.empty
    expect(prismaMock.order.groupBy.mock.calls).to.be.empty
  })

  it('con 10.000 pedidos en la semana, el panel cumple el presupuesto educativo', async () => {
    // Arrange
    // Se fija la fecha (solo Date, los temporizadores siguen reales): si la
    // prueba se corriera justo a medianoche, el reloj podría cambiar de día
    // entre armar los pedidos y calcular el panel. Va antes de autenticar
    // para que el token se emita con esa misma fecha.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 14, 15, 0, 0))
    const { token } = autenticarAdmin()
    const ahora = Date.now()
    const semana = Array.from({ length: 10_000 }, (_, i) => ({
      total: 100_000 + i,
      createdAt: new Date(ahora - (i % 7) * DIA),
    }))
    const pedirPanel = () => {
      programarEstadisticas({ ultimos7Dias: semana })
      return request(app).get('/api/v1/admin/stats').set('Authorization', `Bearer ${token}`)
    }
    await pedirPanel() // calentamiento

    // Act
    const { resultado: res, ms } = await medir(pedirPanel)

    // Assert
    expect(res.status).to.equal(200)
    const pedidosContados = res.body.data.revenueByDay.reduce((n: number, d: { count: number }) => n + d.count, 0)
    expect(pedidosContados).to.equal(10_000)
    expect(ms, `La petición tardó ${ms.toFixed(3)} ms`).to.be.below(PRESUPUESTO_MS)
  })

  it('los 7 días de ingresos salen de una sola consulta, no de una por día', async () => {
    // Arrange
    programarEstadisticas()

    // Act
    await new AdminRepository().getStats()

    // Assert
    // Dos findMany en total: los recientes y la semana. Si vuelven a ser 7
    // consultas por día, este conteo sube a 8.
    expect(prismaMock.order.findMany.mock.calls).to.have.lengthOf(2)
  })

  it('son exactamente 11 consultas y cada tanda lanza las suyas a la vez', async () => {
    // Arrange
    const base = baseConLatencia(LATENCIA_BASE_MS)
    programarEstadisticas({ responder: base.responder })

    // Act
    await new AdminRepository().getStats()

    // Assert
    expect(base.consultas).to.equal(CONSULTAS_DEL_PANEL)
    // Cada tanda se revisa por separado: si alguien rompe el Promise.all de
    // cualquiera de las tres, el máximo en vuelo de esa tanda baja a 1.
    expect(base.maximoEnVuelo('usuarios')).to.equal(4)
    expect(base.maximoEnVuelo('celulares')).to.equal(3)
    expect(base.maximoEnVuelo('pedidos')).to.equal(3)
    expect(base.maximoEnVuelo('semana')).to.equal(1)
  })

  it('las tandas en paralelo son más rápidas que 11 consultas en serie (mediana de 5)', async () => {
    // Arrange
    const base = baseConLatencia(LATENCIA_BASE_MS)
    const repositorio = new AdminRepository()
    const panelEnTandas = () => {
      programarEstadisticas({ responder: base.responder })
      return repositorio.getStats()
    }
    // Referencia: lo que costaría si cada consulta esperara a la anterior.
    const onceConsultasEnSerie = async () => {
      for (let i = 0; i < CONSULTAS_DEL_PANEL; i++) await esperar(LATENCIA_BASE_MS)
    }

    // Act
    const tiemposEnTandas = await repetir(panelEnTandas, 5)
    const tiemposEnSerie = await repetir(onceConsultasEnSerie, 5)

    // Assert
    expect(mediana(tiemposEnTandas)).to.be.below(mediana(tiemposEnSerie))
  })
})
