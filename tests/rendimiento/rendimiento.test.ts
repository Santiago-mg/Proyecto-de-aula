import { describe, expect, it } from 'vitest'
import { performance } from 'node:perf_hooks'
import request from 'supertest'
import app from '../../src/app'
import { evaluarAlerta } from '../../src/domain/stock-alerts'
import { problemasDePassword } from '../../src/domain/credenciales'
import { prismaMock } from '../helpers/prisma-mock'
import { autenticarAdmin, usuario } from '../helpers/fixtures'

/**
 * Pruebas educativas de rendimiento (estilo performance-testing de
 * RegressionTesting): primero se comprueba que el resultado es correcto y
 * después se exige un presupuesto de tiempo.
 *
 * Los límites son deliberadamente amplios para no fallar en equipos lentos o
 * en el pipeline. Miden el costo de la aplicación con la base sustituida por
 * un doble: no son pruebas de carga. Para eso, k6 o JMeter contra un entorno
 * real.
 */

function mediana(valores: number[]): number {
  const orden = [...valores].sort((a, b) => a - b)
  return orden[Math.floor(orden.length / 2)]
}

async function medir(veces: number, fn: () => Promise<unknown>): Promise<number> {
  const tiempos: number[] = []
  for (let i = 0; i < veces; i++) {
    const inicio = performance.now()
    await fn()
    tiempos.push(performance.now() - inicio)
  }
  return mediana(tiempos)
}

describe('Rendimiento — reglas de dominio', () => {
  it('evalúa la alerta de 100.000 celulares en menos de 250 ms', () => {
    const inventario = Array.from({ length: 100_000 }, (_, i) => ({
      stock: i % 12,
      minStock: 5,
    }))

    const inicio = performance.now()
    const alertas = inventario.map((c) => evaluarAlerta(c.stock, c.minStock))
    const duracion = performance.now() - inicio

    // Corrección primero: de cada 12, el 0 es OUT_OF_STOCK y del 1 al 5 LOW_STOCK.
    // 8.333 ciclos completos + un resto de 4 (stocks 0, 1, 2 y 3).
    expect(alertas.filter((a) => a === 'OUT_OF_STOCK')).toHaveLength(8334)
    expect(alertas.filter((a) => a === 'LOW_STOCK')).toHaveLength(41_668)
    expect(duracion, `tardó ${duracion.toFixed(1)} ms`).toBeLessThan(250)
  })

  it('valida 10.000 contraseñas en menos de 250 ms', () => {
    const inicio = performance.now()
    for (let i = 0; i < 10_000; i++) problemasDePassword(`Clave${i}x`)
    const duracion = performance.now() - inicio

    expect(problemasDePassword('Clave1x')).toEqual([
      'La contraseña debe tener al menos 8 caracteres',
    ])
    expect(duracion, `tardó ${duracion.toFixed(1)} ms`).toBeLessThan(250)
  })
})

describe('Rendimiento — endpoints de las funcionalidades', () => {
  it('POST /auth/login: mediana de 15 peticiones bajo 150 ms', async () => {
    prismaMock.user.findUnique.mockResolvedValue(
      usuario({ email: 'ana@gmail.com', password: 'Password123' }),
    )

    const t = await medir(15, () =>
      request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'ana@gmail.com', password: 'Password123' })
        .expect(200),
    )

    expect(t, `mediana ${t.toFixed(1)} ms`).toBeLessThan(150)
  })

  it('GET /admin/alerts con 500 alertas abiertas: mediana bajo 150 ms', async () => {
    const { token } = autenticarAdmin()
    prismaMock.alert.findMany.mockResolvedValue(
      Array.from({ length: 500 }, (_, i) => ({
        id: `a${i}`,
        phoneId: `p${i}`,
        type: 'LOW_STOCK',
        message: 'mensaje',
        isResolved: false,
        createdAt: new Date(),
        phone: { id: `p${i}`, name: 'Celular', slug: `c-${i}`, stock: 1, minStock: 5, heroImage: null },
      })),
    )

    const t = await medir(15, async () => {
      const res = await request(app)
        .get('/api/v1/admin/alerts')
        .set('Authorization', `Bearer ${token}`)
      expect(res.body.data).toHaveLength(500)
    })

    expect(t, `mediana ${t.toFixed(1)} ms`).toBeLessThan(150)
  })
})
