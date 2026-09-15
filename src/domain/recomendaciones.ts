/**
 * Reglas de negocio de la recomendación de productos (funcionalidad 13).
 *
 * Igual que stock-alerts.ts, vive en el dominio y no conoce Prisma: son
 * funciones puras. El repositorio se encarga de traer los candidatos de la
 * base y estas funciones deciden cuáles se parecen más al celular que el
 * cliente está viendo. Así la regla se puede probar sin levantar nada y, si
 * mañana los candidatos vinieran de otra parte, la regla no cambia.
 */

/**
 * Cuánto pesa cada criterio.
 *
 * El orden no es arbitrario: la funcionalidad los enuncia como "marca,
 * categoría o rango de precio", de lo más específico a lo más general. Un
 * cliente que mira un Samsung espera antes otro Samsung que otro celular
 * cualquiera que cueste lo mismo.
 */
export const PESO_MARCA = 3
export const PESO_CATEGORIA = 2
export const PESO_PRECIO = 1

/** Un candidato es "del mismo rango" si su precio no se aleja más de esto. */
export const MARGEN_PRECIO = 0.25

/** Lo mínimo que hace falta saber de un celular para compararlo con otro. */
export interface CelularComparable {
  id: string
  brand: string
  categoryId: string
  price: number
}

/**
 * Ventana de precio considerada equivalente, redondeada a pesos enteros
 * porque la columna `price` es un entero.
 */
export function rangoDePrecio(precio: number): { min: number; max: number } {
  return {
    min: Math.round(precio * (1 - MARGEN_PRECIO)),
    max: Math.round(precio * (1 + MARGEN_PRECIO)),
  }
}

/**
 * Suma los puntos que gana un candidato por parecerse al celular base.
 *
 * El máximo es 6 (misma marca, misma categoría y precio equivalente) y el
 * mínimo 0. La marca se compara sin distinguir mayúsculas porque la consulta
 * que trae los candidatos también lo hace, y si no, "Apple" y "apple"
 * puntuarían distinto según cómo se hubiera escrito en el catálogo.
 */
export function afinidad(
  base: CelularComparable,
  candidato: CelularComparable,
): number {
  let puntaje = 0

  if (candidato.brand.toLowerCase() === base.brand.toLowerCase()) {
    puntaje += PESO_MARCA
  }
  if (candidato.categoryId === base.categoryId) {
    puntaje += PESO_CATEGORIA
  }
  const { min, max } = rangoDePrecio(base.price)
  if (candidato.price >= min && candidato.price <= max) {
    puntaje += PESO_PRECIO
  }

  return puntaje
}

/**
 * Ordena los candidatos de mayor a menor afinidad y recorta a `limite`.
 *
 * El desempate es por cercanía de precio: entre dos celulares igual de
 * parecidos, se muestra primero el que cuesta algo más próximo al que el
 * cliente está mirando. Sin ese desempate el orden dependería del que
 * devolviera la base, que no es estable.
 */
export function ordenarPorAfinidad<T extends CelularComparable>(
  base: CelularComparable,
  candidatos: T[],
  limite: number,
): T[] {
  return candidatos
    .map((candidato) => ({ candidato, puntaje: afinidad(base, candidato) }))
    .sort(
      (a, b) =>
        b.puntaje - a.puntaje ||
        Math.abs(a.candidato.price - base.price) -
          Math.abs(b.candidato.price - base.price),
    )
    .slice(0, limite)
    .map((fila) => fila.candidato)
}
