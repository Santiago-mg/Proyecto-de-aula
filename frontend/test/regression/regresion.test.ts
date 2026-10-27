import { describe, it, expect } from 'vitest'
import { calcularTotales, UMBRAL_ENVIO_GRATIS, COSTO_ENVIO } from '../../src/utils/pricing'

/**
 * Suite de regresión (estilo RegressionTesting: nombres `regresion_*`, AAA,
 * un valor de referencia fijo por prueba) para el resumen de precios que
 * el frontend muestra antes de confirmar el pedido (func. 22).
 *
 * Estos números deben ser IDÉNTICOS a los que fija
 * tests/regression/regresion.test.ts en el backend
 * (Proyecto-de-aula-mario/tests/regression). Si algún día cambia el umbral
 * o el costo de envío en un solo lado, una de las dos suites se rompe con
 * un nombre que dice exactamente qué regla dejó de coincidir.
 */

describe('Regresión — resumen de precios del checkout (func. 22)', () => {
  it('regresion_envio_gratis_a_partir_de_500_001', () => {
    // Arrange
    const items = [{ price: 500_001, qty: 1 }]

    // Act
    const totales = calcularTotales(items)

    // Assert
    expect(totales.shipping).toBe(0)
    expect(totales.total).toBe(500_001)
  })

  it('regresion_envio_tiene_costo_en_el_umbral_exacto_de_500_000', () => {
    // Arrange
    const items = [{ price: 500_000, qty: 1 }]

    // Act
    const totales = calcularTotales(items)

    // Assert
    expect(totales.shipping).toBe(20_000)
    expect(totales.total).toBe(520_000)
  })

  it('regresion_constantes_de_envio_coinciden_con_las_del_backend', () => {
    // Estas dos constantes son la única fuente de verdad del lado
    // frontend; si cambian aquí sin cambiar también en
    // OrderRepository.ts del backend, el resumen que ve el cliente deja
    // de coincidir con lo que de verdad se le cobra.
    expect(UMBRAL_ENVIO_GRATIS).toBe(500_000)
    expect(COSTO_ENVIO).toBe(20_000)
  })

  it('regresion_multiples_items_suman_precio_por_cantidad_no_por_linea', () => {
    // Arrange: dos unidades del mismo celular en una sola línea del carrito.
    const items = [{ price: 100_000, qty: 2 }]

    // Act
    const totales = calcularTotales(items)

    // Assert
    expect(totales.subtotal).toBe(200_000)
  })
})
