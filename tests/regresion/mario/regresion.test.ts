import { describe, it, expect } from 'vitest'
import {
  afinidad,
  ordenarPorAfinidad,
  rangoDePrecio,
} from '../../../src/domain/recomendaciones'
import { evaluarAlerta } from '../../../src/domain/stock-alerts'
import { createOrder, updateOrderStatus } from '../../../src/application/use-cases/orders.use-cases'
import { changeUserRole, banUser } from '../../../src/application/use-cases/admin.use-cases'
import { OrderRepository } from '../../../src/infrastructure/repositories/OrderRepository'
import { AdminRepository } from '../../../src/infrastructure/repositories/AdminRepository'
import { prismaMock } from '../../helpers/prisma-mock'
import { usuarioConConteo } from '../../helpers/fixtures'

/**
 * Suite de regresión (estilo RegressionTesting: nombres `test_regresion_*`,
 * AAA, un valor de referencia fijo por prueba).
 *
 * El objetivo no es volver a recorrer cada camino de las funcionalidades
 * 13, 14, 21, 22, 25, 26 y 27 — eso ya lo hacen las pruebas unitarias y los
 * escenarios existentes — sino dejar clavados los números y mensajes de los
 * que depende el negocio, para que un refactor futuro que los cambie sin
 * querer falle aquí con un nombre que dice exactamente qué regla se rompió.
 */

const orderRepo = new OrderRepository()
const adminRepo = new AdminRepository()

describe('Regresión — recomendación de productos (func. 13)', () => {
  it('regresion_afinidad_maxima_es_6_puntos', () => {
    // Arrange
    const base = { id: 'p1', brand: 'Apple', categoryId: 'apple', price: 1_000_000 }
    const igual = { id: 'p2', brand: 'Apple', categoryId: 'apple', price: 1_000_000 }

    // Act
    const puntaje = afinidad(base, igual)

    // Assert
    expect(puntaje).toBe(6)
  })

  it('regresion_margen_de_precio_equivalente_es_25_por_ciento', () => {
    // Arrange
    const precio = 200_000

    // Act
    const { min, max } = rangoDePrecio(precio)

    // Assert
    expect(min).toBe(150_000)
    expect(max).toBe(250_000)
  })

  it('regresion_limite_de_recomendaciones_recorta_la_lista', () => {
    // Arrange
    const base = { id: 'base', brand: 'Apple', categoryId: 'apple', price: 1_000_000 }
    const candidatos = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      brand: 'Apple',
      categoryId: 'apple',
      price: 1_000_000,
    }))

    // Act
    const resultado = ordenarPorAfinidad(base, candidatos, 4)

    // Assert
    expect(resultado).toHaveLength(4)
  })
})

describe('Regresión — alertas de stock bajo (func. 14)', () => {
  it('regresion_stock_igual_al_minimo_dispara_low_stock', () => {
    expect(evaluarAlerta(10, 10)).toBe('LOW_STOCK')
  })

  it('regresion_stock_en_cero_dispara_out_of_stock_no_low_stock', () => {
    expect(evaluarAlerta(0, 10)).toBe('OUT_OF_STOCK')
  })

  it('regresion_stock_por_encima_del_minimo_no_dispara_alerta', () => {
    expect(evaluarAlerta(11, 10)).toBeNull()
  })
})

describe('Regresión — crear orden (func. 22)', () => {
  it('regresion_envio_gratis_a_partir_de_500_001', async () => {
    // Arrange: un solo celular de 500.001 — un peso por encima del umbral.
    const phoneId = '3f2504e0-4f89-11d3-9a0c-0305e82c3301'
    prismaMock.phone.findMany.mockResolvedValue([
      { id: phoneId, name: 'Celular', price: 500_001, heroImage: null, stock: 5 },
    ])
    prismaMock.phone.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.order.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'pedido-1',
        ...data,
        status: 'CONFIRMED',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: null,
        items: [],
      }),
    )

    // Act
    const resultado = await createOrder(orderRepo, {
      email: 'ana@test.com',
      name: 'Ana Garcia',
      phone: '+57 300 123 4567',
      address: 'Calle 123',
      city: 'Bogota',
      dept: 'Cundinamarca',
      items: [{ phoneId, qty: 1 }],
    })

    // Assert: si el umbral de 500.000 cambia de valor sin querer, esta
    // prueba es la que se rompe, no un test genérico de "crea la orden".
    expect(resultado.shipping).toBe(0)
    expect(resultado.total).toBe(500_001)
  })

  it('regresion_envio_tiene_costo_en_el_umbral_exacto_de_500_000', async () => {
    // Arrange: subtotal exactamente en 500.000 — el repositorio usa `>`, no
    // `>=`, así que en el límite el envío todavía cuesta.
    const phoneId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
    prismaMock.phone.findMany.mockResolvedValue([
      { id: phoneId, name: 'Celular', price: 500_000, heroImage: null, stock: 5 },
    ])
    prismaMock.phone.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.order.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'pedido-2',
        ...data,
        status: 'CONFIRMED',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: null,
        items: [],
      }),
    )

    // Act
    const resultado = await createOrder(orderRepo, {
      email: 'ana@test.com',
      name: 'Ana Garcia',
      phone: '+57 300 123 4567',
      address: 'Calle 123',
      city: 'Bogota',
      dept: 'Cundinamarca',
      items: [{ phoneId, qty: 1 }],
    })

    // Assert
    expect(resultado.shipping).toBe(20_000)
    expect(resultado.total).toBe(520_000)
  })
})

describe('Regresión — actualizar estado de una orden (func. 25)', () => {
  it('regresion_pedido_entregado_es_un_estado_terminal', async () => {
    // Arrange
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'pedido-1',
      userId: 'u1',
      status: 'DELIVERED',
      items: [],
    })

    // Act & Assert: DELIVERED no admite ninguna transición.
    await expect(
      updateOrderStatus(orderRepo, 'pedido-1', 'CANCELLED'),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('es un estado final'),
    })
    expect(prismaMock.order.update).not.toHaveBeenCalled()
  })
})

describe('Regresión — banear / cambiar rol (func. 21, 26)', () => {
  it('regresion_mensaje_exacto_al_intentar_banearse_a_si_mismo', async () => {
    // Arrange
    const admin = usuarioConConteo({ role: 'ADMIN' })

    // Act & Assert: el mensaje es lo que lee el admin en el toast del
    // frontend, así que un cambio de texto aquí es un cambio de UX real.
    await expect(
      banUser(adminRepo, admin.id, { reason: 'motivo' }, admin.id),
    ).rejects.toMatchObject({ message: 'No puedes banear tu propia cuenta' })
  })

  it('regresion_mensaje_exacto_al_intentar_cambiarse_el_rol_a_si_mismo', async () => {
    // Arrange
    const admin = usuarioConConteo({ role: 'ADMIN' })

    // Act & Assert
    await expect(
      changeUserRole(adminRepo, admin.id, { role: 'USER' }, admin.id),
    ).rejects.toMatchObject({ message: 'No puedes cambiar tu propio rol' })
  })
})
