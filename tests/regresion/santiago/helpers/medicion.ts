import { performance } from 'node:perf_hooks'

/**
 * Herramientas de medición de performance-testing.
 *
 * Son el equivalente directo de lo que usa el ejemplo del profesor
 * (RegressionTesting/performance-testing) en Python:
 *
 *   time.perf_counter()            →  medir()
 *   timeit.repeat(number=1, ...)   →  repetir()
 *   statistics.median()            →  mediana()
 *
 * Todo se mide en milisegundos, que es la unidad de performance.now().
 */

/** Ejecuta la operación una vez y devuelve su resultado y cuánto tardó. */
export async function medir<T>(
  operacion: () => Promise<T> | T,
): Promise<{ resultado: T; ms: number }> {
  const inicio = performance.now()
  const resultado = await operacion()
  return { resultado, ms: performance.now() - inicio }
}

/** Ejecuta la operación varias veces y devuelve la duración de cada una. */
export async function repetir(
  operacion: () => Promise<unknown> | unknown,
  veces = 5,
): Promise<number[]> {
  const tiempos: number[] = []
  for (let i = 0; i < veces; i++) {
    const { ms } = await medir(operacion)
    tiempos.push(ms)
  }
  return tiempos
}

/** Mediana: a diferencia del promedio, una medición atípica no la arrastra. */
export function mediana(valores: number[]): number {
  if (valores.length === 0) throw new Error('No hay mediciones')
  const ordenados = [...valores].sort((a, b) => a - b)
  const mitad = Math.floor(ordenados.length / 2)
  return ordenados.length % 2 === 0
    ? (ordenados[mitad - 1] + ordenados[mitad]) / 2
    : ordenados[mitad]
}

/** Promesa que se resuelve sola después de `ms` milisegundos. */
export function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms))
}

/**
 * Simula la latencia de la base de datos y cuenta la concurrencia.
 *
 * Cada `responder(valor, grupo)` produce una implementación para un vi.fn()
 * del doble de Prisma que tarda `latenciaMs` en contestar, como un Postgres
 * real. Mientras tanto lleva la cuenta de cuántas consultas hubo y de cuántas
 * de cada grupo llegaron a estar en vuelo al mismo tiempo.
 *
 * El grupo sirve cuando el código lanza varias tandas con Promise.all, una
 * detrás de otra: cada tanda se etiqueta con su propio grupo y se revisa por
 * separado. Si una refactorización convierte el Promise.all de una tanda en
 * awaits sucesivos, `maximoEnVuelo(grupo)` de esa tanda baja a 1 y la prueba
 * lo detecta sin depender del reloj, aunque las otras tandas sigan bien.
 */
export function baseConLatencia(latenciaMs: number) {
  const enVuelo = new Map<string, number>()
  const maximos = new Map<string, number>()
  let consultas = 0

  return {
    responder<T>(valor: T, grupo = 'todas') {
      return (): Promise<T> => {
        consultas++
        const ahora = (enVuelo.get(grupo) ?? 0) + 1
        enVuelo.set(grupo, ahora)
        maximos.set(grupo, Math.max(maximos.get(grupo) ?? 0, ahora))
        return esperar(latenciaMs).then(() => {
          enVuelo.set(grupo, (enVuelo.get(grupo) ?? 1) - 1)
          return valor
        })
      }
    },
    get consultas() {
      return consultas
    },
    /** Cuántas consultas del grupo llegaron a estar en vuelo a la vez. */
    maximoEnVuelo(grupo = 'todas') {
      return maximos.get(grupo) ?? 0
    },
  }
}
