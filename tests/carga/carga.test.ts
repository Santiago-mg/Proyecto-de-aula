import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import autocannon from 'autocannon'
import { prismaMock } from '../helpers/prisma-mock'
import { celular, generarToken, usuario } from '../helpers/fixtures'

/**
 * Pruebas de carga con autocannon sobre la aplicación Express real.
 *
 * Condiciones (iguales en cada ejecución):
 *   - Rutas, middlewares, validación, casos de uso y repositorios reales.
 *   - bcrypt NATIVO con costo 12, el mismo que producción (se desactiva el
 *     doble que instala tests/setup.ts).
 *   - La base de datos se sustituye por un doble que responde con 5 ms de
 *     latencia por consulta, para aislar el rendimiento de la aplicación del
 *     de un Postgres concreto.
 *
 * Cada escenario define conexiones simultáneas, duración y criterios de
 * aceptación. Los resultados quedan en docs/evidencias/rendimiento/.
 */

vi.mock('bcrypt', async () => {
  const real = await vi.importActual<typeof import('bcrypt')>('bcrypt')
  return { ...real, default: real }
})

const LATENCIA_BD_MS = 5
const SALIDA = path.resolve(__dirname, '../../docs/evidencias/rendimiento')

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))
function conLatencia<T>(valor: T | (() => T)) {
  return async () => {
    await espera(LATENCIA_BD_MS)
    return typeof valor === 'function' ? (valor as () => T)() : valor
  }
}

interface Criterio {
  descripcion: string
  cumple: (r: autocannon.Result) => boolean
  /** Se mide y se informa, pero no hace fallar la prueba (ver análisis). */
  informativo?: boolean
}

interface Escenario {
  id: string
  nombre: string
  objetivo: string
  peticion: string
  conexiones: number
  duracion: number
  criterios: Criterio[]
}

const resultados: Array<{ escenario: Escenario; r: autocannon.Result; cumplidos: boolean[] }> = []

let server: Server
let base: string

async function cargar(escenario: Escenario, ruta: string, opciones: Partial<autocannon.Options> = {}) {
  const r = await autocannon({
    url: base + ruta,
    connections: escenario.conexiones,
    duration: escenario.duracion,
    ...opciones,
  } as autocannon.Options)
  const cumplidos = escenario.criterios.map((c) => c.cumple(r))
  resultados.push({ escenario, r, cumplidos })
  return { r, cumplidos }
}

const p975 = (r: autocannon.Result) => r.latency.p97_5
const errores5xx = (r: autocannon.Result) => r['5xx'] + r.errors + r.timeouts

beforeAll(async () => {
  const { default: app } = await import('../../src/app')
  server = app.listen(0)
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  server?.close()
  escribirEvidencia()
})

describe('Carga — catálogo, sesión, perfil y panel de alertas', () => {
  it('E1 catálogo público', async () => {
    prismaMock.phone.count.mockImplementation(conLatencia(9))
    prismaMock.phone.findMany.mockImplementation(conLatencia(() => Array.from({ length: 9 }, () => celular())))

    const { r, cumplidos } = await cargar(
      {
        id: 'E1',
        nombre: 'Catálogo público',
        objetivo: 'Comprobar que el listado de celulares atiende a 50 usuarios simultáneos con tiempos bajos y sin errores.',
        peticion: 'GET /api/v1/phones?page=1&limit=12',
        conexiones: 50,
        duracion: 10,
        criterios: [
          { descripcion: 'p97,5 ≤ 200 ms', cumple: (r) => p975(r) <= 200 },
          { descripcion: '0 errores (5xx, de red o timeouts)', cumple: (r) => errores5xx(r) === 0 },
          { descripcion: '≥ 300 peticiones/s', cumple: (r) => r.requests.average >= 300 },
        ],
      },
      '/api/v1/phones?page=1&limit=12',
    )

    expect(r.non2xx).toBe(0)
    expect(cumplidos).toEqual([true, true, true])
  })

  it('E2 inicio de sesión con bcrypt real', async () => {
    const hash = await (await vi.importActual<typeof import('bcrypt')>('bcrypt')).hash('Password123', 12)
    prismaMock.user.findUnique.mockImplementation(conLatencia(() => ({ ...usuario({ email: 'ana@gmail.com' }), password: hash })))

    const { r, cumplidos } = await cargar(
      {
        id: 'E2',
        nombre: 'Inicio de sesión',
        objetivo: 'Medir el costo real de verificar contraseñas (bcrypt costo 12) con 10 usuarios ingresando a la vez.',
        peticion: 'POST /api/v1/auth/login (credenciales correctas)',
        conexiones: 10,
        duracion: 10,
        criterios: [
          { descripcion: 'p97,5 ≤ 1500 ms', cumple: (r) => p975(r) <= 1500, informativo: true },
          { descripcion: '0 errores (5xx, de red o timeouts)', cumple: (r) => errores5xx(r) === 0 },
          { descripcion: '100 % de respuestas 200', cumple: (r) => r.non2xx === 0 },
        ],
      },
      '/api/v1/auth/login',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'ana@gmail.com', password: 'Password123' }),
      },
    )

    // Correcto bajo carga: sin errores y todas las respuestas 200. La
    // latencia queda registrada como hallazgo (costo 12 en 1 vCPU).
    expect(cumplidos.slice(1)).toEqual([true, true])
    expect(r.requests.total).toBeGreaterThan(0)
  })

  it('E2b inicio de sesión con bcrypt costo 10 (alternativa recomendada)', async () => {
    const hash = await (await vi.importActual<typeof import('bcrypt')>('bcrypt')).hash('Password123', 10)
    prismaMock.user.findUnique.mockImplementation(conLatencia(() => ({ ...usuario({ email: 'ana@gmail.com' }), password: hash })))

    const { cumplidos } = await cargar(
      {
        id: 'E2b',
        nombre: 'Inicio de sesión, costo 10',
        objetivo: 'Medir el mismo escenario E2 con contraseñas hasheadas con costo 10, el mínimo recomendado por OWASP.',
        peticion: 'POST /api/v1/auth/login (hash con costo 10)',
        conexiones: 10,
        duracion: 10,
        criterios: [
          { descripcion: 'p97,5 ≤ 1500 ms', cumple: (r) => p975(r) <= 1500 },
          { descripcion: '0 errores (5xx, de red o timeouts)', cumple: (r) => errores5xx(r) === 0 },
          { descripcion: '100 % de respuestas 200', cumple: (r) => r.non2xx === 0 },
        ],
      },
      '/api/v1/auth/login',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'ana@gmail.com', password: 'Password123' }),
      },
    )

    expect(cumplidos).toEqual([true, true, true])
  })

  it('E3 panel de alertas de stock (administrador)', async () => {
    const admin = usuario({ role: 'ADMIN' })
    prismaMock.user.findUnique.mockImplementation(conLatencia(admin))
    prismaMock.alert.findMany.mockImplementation(
      conLatencia(() =>
        Array.from({ length: 20 }, (_, i) => ({
          id: `a${i}`, phoneId: `p${i}`, type: 'LOW_STOCK', message: 'mensaje', isResolved: false,
          createdAt: new Date(), phone: { id: `p${i}`, name: 'Celular', slug: `c${i}`, stock: 2, minStock: 5, heroImage: null },
        })),
      ),
    )

    const { cumplidos } = await cargar(
      {
        id: 'E3',
        nombre: 'Panel de alertas de stock',
        objetivo: 'Comprobar que la consulta de alertas, que autentica y relee el rol en cada petición, soporta 50 sesiones de administrador.',
        peticion: 'GET /api/v1/admin/alerts (token de administrador)',
        conexiones: 50,
        duracion: 10,
        criterios: [
          { descripcion: 'p97,5 ≤ 200 ms', cumple: (r) => p975(r) <= 200 },
          { descripcion: '0 errores (5xx, de red o timeouts)', cumple: (r) => errores5xx(r) === 0 },
          { descripcion: '100 % de respuestas 200', cumple: (r) => r.non2xx === 0 },
        ],
      },
      '/api/v1/admin/alerts',
      { headers: { authorization: `Bearer ${generarToken(admin)}` } },
    )

    expect(cumplidos).toEqual([true, true, true])
  })

  it('E4 edición de perfil', async () => {
    const u = usuario({ name: 'Ana' })
    prismaMock.user.findUnique.mockImplementation(conLatencia(u))
    prismaMock.user.update.mockImplementation(conLatencia({ ...u, name: 'Ana María' }))

    const { cumplidos } = await cargar(
      {
        id: 'E4',
        nombre: 'Edición de perfil',
        objetivo: 'Comprobar que guardar el nombre (validación + autenticación + escritura) soporta 30 usuarios a la vez.',
        peticion: 'PATCH /api/v1/auth/me',
        conexiones: 30,
        duracion: 10,
        criterios: [
          { descripcion: 'p97,5 ≤ 200 ms', cumple: (r) => p975(r) <= 200 },
          { descripcion: '0 errores (5xx, de red o timeouts)', cumple: (r) => errores5xx(r) === 0 },
          { descripcion: '100 % de respuestas 200', cumple: (r) => r.non2xx === 0 },
        ],
      },
      '/api/v1/auth/me',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${generarToken(u)}` },
        body: JSON.stringify({ name: 'Ana María' }),
      },
    )

    expect(cumplidos).toEqual([true, true, true])
  })

  it('E5 fuerza bruta bajo carga: el limitador corta los intentos sin gastar CPU', async () => {
    const hash = await (await vi.importActual<typeof import('bcrypt')>('bcrypt')).hash('Correcta123', 12)
    prismaMock.user.findUnique.mockImplementation(conLatencia(() => ({ ...usuario({ email: 'victima@gmail.com' }), password: hash })))

    const { r, cumplidos } = await cargar(
      {
        id: 'E5',
        nombre: 'Fuerza bruta con limitador',
        objetivo: 'Simular un ataque de 20 conexiones probando contraseñas sobre una cuenta y verificar que se bloquea con 429 sin degradar el servicio.',
        peticion: 'POST /api/v1/auth/login (contraseña incorrecta, misma cuenta)',
        conexiones: 20,
        duracion: 8,
        criterios: [
          { descripcion: '≥ 95 % de respuestas 429', cumple: (r) => (r.statusCodeStats?.['429']?.count ?? 0) / r.requests.total >= 0.95 },
          { descripcion: 'p97,5 ≤ 100 ms (los 429 no ejecutan bcrypt)', cumple: (r) => p975(r) <= 100 },
          { descripcion: '0 errores (5xx, de red o timeouts)', cumple: (r) => errores5xx(r) === 0 },
        ],
      },
      '/api/v1/auth/login',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'victima@gmail.com', password: 'Incorrecta1' }),
      },
    )

    expect(r.statusCodeStats?.['401']?.count ?? 0).toBeLessThanOrEqual(25) // 5 por cuenta, más los que ya estaban en vuelo
    expect(cumplidos).toEqual([true, true, true])
  })
})

function escribirEvidencia() {
  fs.mkdirSync(SALIDA, { recursive: true })
  const entorno = {
    fecha: new Date().toISOString(),
    node: process.version,
    cpu: os.cpus()[0]?.model ?? 'desconocida',
    nucleos: os.cpus().length,
    memoriaGB: Math.round(os.totalmem() / 1024 ** 3),
    latenciaBdSimuladaMs: LATENCIA_BD_MS,
    bcrypt: 'nativo, costo 12',
  }
  const datos = resultados.map(({ escenario, r, cumplidos }) => ({
    id: escenario.id,
    nombre: escenario.nombre,
    objetivo: escenario.objetivo,
    peticion: escenario.peticion,
    conexiones: escenario.conexiones,
    duracionS: escenario.duracion,
    peticionesTotales: r.requests.total,
    peticionesPorSegundo: Math.round(r.requests.average),
    latenciaMs: { p50: r.latency.p50, p90: r.latency.p90, p97_5: r.latency.p97_5, p99: r.latency.p99, max: r.latency.max },
    codigos: Object.fromEntries(Object.entries(r.statusCodeStats ?? {}).map(([k, v]) => [k, v.count])),
    errores: { '5xx': r['5xx'], red: r.errors, timeouts: r.timeouts },
    criterios: escenario.criterios.map((c, i) => ({ criterio: c.descripcion, cumple: cumplidos[i], informativo: Boolean(c.informativo) })),
  }))
  fs.writeFileSync(path.join(SALIDA, 'resultados-carga.json'), JSON.stringify({ entorno, escenarios: datos }, null, 2))

  const filas = datos
    .map(
      (d) =>
        `| ${d.id} | ${d.peticion} | ${d.conexiones} / ${d.duracionS} s | ${d.peticionesTotales} | ${d.peticionesPorSegundo} | ${d.latenciaMs.p50} | ${d.latenciaMs.p97_5} | ${d.latenciaMs.max} | ${Object.entries(d.codigos).map(([k, v]) => `${k}: ${v}`).join(', ')} | ${d.errores['5xx'] + d.errores.red + d.errores.timeouts} | ${d.criterios.every((c) => c.cumple) ? 'Cumple' : 'No cumple'} |`,
    )
    .join('\n')
  const criterios = datos
    .map((d) => `- **${d.id} ${d.nombre}:** ${d.criterios.map((c) => `${c.criterio}${c.informativo ? ' (informativo)' : ''} → ${c.cumple ? 'cumple' : 'NO cumple'}`).join('; ')}`)
    .join('\n')
  fs.writeFileSync(
    path.join(SALIDA, 'resultados-carga.md'),
    `# Resultados de carga — ${entorno.fecha}\n\nEntorno: Node ${entorno.node}, ${entorno.cpu} (${entorno.nucleos} núcleos, ${entorno.memoriaGB} GB), base simulada con ${LATENCIA_BD_MS} ms por consulta, bcrypt ${entorno.bcrypt}.\n\n| Esc. | Petición | Conexiones / duración | Peticiones | Pet./s | p50 ms | p97,5 ms | máx ms | Códigos | Errores | Resultado |\n|---|---|---|---:|---:|---:|---:|---:|---|---:|---|\n${filas}\n\n## Criterios de aceptación\n\n${criterios}\n`,
  )
}
