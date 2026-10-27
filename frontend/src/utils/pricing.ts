import type { CartItem } from '../types/order'

/**
 * Umbral de envío gratis. Debe coincidir siempre con la misma regla del
 * backend (src/infrastructure/repositories/OrderRepository.ts en el repo
 * de la API): `subtotal > UMBRAL_ENVIO_GRATIS ? 0 : COSTO_ENVIO`.
 *
 * Antes esta cuenta vivía repetida e inline dentro de Checkout.tsx. Vivía
 * bien ahí para lo visual, pero significaba que si el backend cambiaba el
 * umbral, el resumen que el cliente ve antes de pagar podía quedar
 * desincronizado sin que ninguna prueba lo notara. Al extraerla, un cambio
 * de cualquiera de las dos constantes rompe la prueba de regresión
 * correspondiente en vez de solo notarse en producción.
 */
export const UMBRAL_ENVIO_GRATIS = 500_000
export const COSTO_ENVIO = 20_000

export interface Totales {
  subtotal: number
  shipping: number
  total: number
}

/** Réplica, en el frontend, de la regla de envío que aplica el backend al crear la orden. */
export function calcularTotales(items: Pick<CartItem, 'price' | 'qty'>[]): Totales {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const shipping = subtotal > UMBRAL_ENVIO_GRATIS ? 0 : COSTO_ENVIO
  return { subtotal, shipping, total: subtotal + shipping }
}
