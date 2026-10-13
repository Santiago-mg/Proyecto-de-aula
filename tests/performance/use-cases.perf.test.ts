import { describe, expect, it, vi } from 'vitest'
import { performance } from 'node:perf_hooks'
import { changeUserRole } from '../../src/application/use-cases/admin.use-cases'
import {
  createOrder,
  getAllOrders,
  getMyOrders,
} from '../../src/application/use-cases/orders.use-cases'
import { getPhoneBySlug } from '../../src/application/use-cases/phones.use-cases'
import type { IAdminRepository } from '../../src/domain/repositories/IAdminRepository'
import type { IOrderRepository } from '../../src/domain/repositories/IOrderRepository'
import type { IPhoneRepository } from '../../src/domain/repositories/IPhoneRepository'

const LIMITE_MEDIANA_MS = 25
const MUESTRAS = 200
const CALENTAMIENTO = 20

function mediana(valores: number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b)
  const medio = Math.floor(ordenados.length / 2)
  if (ordenados.length % 2 !== 0) return ordenados[medio]
  return (ordenados[medio - 1] + ordenados[medio]) / 2
}

async function medirMediana(
  ejecutar: () => Promise<unknown>,
): Promise<number> {
  for (let i = 0; i < CALENTAMIENTO; i += 1) await ejecutar()
  const duraciones: number[] = []
  for (let i = 0; i < MUESTRAS; i += 1) {
    const inicio = performance.now()
    await ejecutar()
    duraciones.push(performance.now() - inicio)
  }
  return mediana(duraciones)
}

const ID_USER = '33333333-3333-3333-3333-333333333333'
const ID_OTRO = '44444444-4444-4444-4444-444444444444'

function usuario() {
  const ahora = new Date()
  return {
    id: ID_USER,
    email: 'ana@test.com',
    name: 'Ana',
    role: 'ADMIN',
    banned: false,
    banReason: null,
    bannedAt: null,
    createdAt: ahora,
    updatedAt: ahora,
    orderCount: 0,
  }
}

function pedido() {
  const ahora = new Date()
  return {
    id: '77777777-7777-7777-7777-777777777777',
    orderRef: 'CP-A1B2C3',
    userId: ID_USER,
    email: 'ana@test.com',
    name: 'Ana Garcia',
    phone: '+57 300 123 4567',
    address: 'Calle 123 #45-67',
    city: 'Bogota',
    dept: 'Cundinamarca',
    subtotal: 1_020_000,
    shipping: 0,
    total: 1_020_000,
    status: 'PENDING',
    items: [
      {
        id: 1,
        phoneId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
        name: 'iPhone 15',
        heroImage: null,
        price: 380_000,
        qty: 2,
        colorId: null,
        colorName: null,
      },
    ],
    createdAt: ahora,
    updatedAt: ahora,
  }
}

function caminoPedido() {
  return {
    email: 'ana@test.com',
    name: 'Ana Garcia',
    phone: '+57 300 123 4567',
    address: 'Calle 123 #45-67',
    city: 'Bogota',
    dept: 'Cundinamarca',
    items: [{ phoneId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301', qty: 2 }],
  }
}

function paginaDePedidos() {
  return {
    data: [pedido()],
    meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
  }
}

function celular() {
  const ahora = new Date()
  return {
    id: '88888888-8888-8888-8888-888888888888',
    slug: 'iphone-15',
    name: 'iPhone 15',
    brand: 'Apple',
    categoryId: 'apple',
    price: 2_700_000,
    compareAt: null,
    badge: null,
    stock: 5,
    condition: 'CERTIFIED',
    verified: true,
    batteryHealth: null,
    ram: null,
    storage: '128GB',
    camera: null,
    battery: null,
    screen: null,
    chip: null,
    shortDesc: null,
    longDesc: null,
    heroImage: null,
    images: [],
    colors: [],
    features: [],
    createdAt: ahora,
    updatedAt: ahora,
  }
}

describe('rendimiento de los use-cases', () => {
  it('changeUserRole se resuelve por debajo del límite', async () => {
    const repo = {
      changeRole: vi.fn().mockResolvedValue(usuario()),
    } as unknown as IAdminRepository

    const medianaMs = await medirMediana(() =>
      changeUserRole(repo, ID_USER, { role: 'ADMIN' }, ID_OTRO),
    )

    console.log(`changeUserRole → mediana ${(medianaMs * 1000).toFixed(1)} µs`)
    expect(medianaMs).toBeLessThan(LIMITE_MEDIANA_MS)
  })

  it('getMyOrders se resuelve por debajo del límite', async () => {
    const repo = {
      findByUser: vi.fn().mockResolvedValue([pedido()]),
    } as unknown as IOrderRepository

    const medianaMs = await medirMediana(() => getMyOrders(repo, ID_USER))

    console.log(`getMyOrders → mediana ${(medianaMs * 1000).toFixed(1)} µs`)
    expect(medianaMs).toBeLessThan(LIMITE_MEDIANA_MS)
  })

  it('getAllOrders se resuelve por debajo del límite', async () => {
    const repo = {
      findAll: vi.fn().mockResolvedValue(paginaDePedidos()),
    } as unknown as IOrderRepository

    const medianaMs = await medirMediana(() => getAllOrders(repo, 1, 20))

    console.log(`getAllOrders → mediana ${(medianaMs * 1000).toFixed(1)} µs`)
    expect(medianaMs).toBeLessThan(LIMITE_MEDIANA_MS)
  })

  it('getPhoneBySlug se resuelve por debajo del límite', async () => {
    const repo = {
      findBySlug: vi.fn().mockResolvedValue(celular()),
    } as unknown as IPhoneRepository

    const medianaMs = await medirMediana(() =>
      getPhoneBySlug(repo, 'iphone-15'),
    )

    console.log(`getPhoneBySlug → mediana ${(medianaMs * 1000).toFixed(1)} µs`)
    expect(medianaMs).toBeLessThan(LIMITE_MEDIANA_MS)
  })

  it('createOrder se resuelve por debajo del límite', async () => {
    const repo = {
      create: vi.fn().mockResolvedValue(pedido()),
    } as unknown as IOrderRepository

    const medianaMs = await medirMediana(() =>
      createOrder(repo, caminoPedido(), ID_USER),
    )

    console.log(`createOrder → mediana ${(medianaMs * 1000).toFixed(1)} µs`)
    expect(medianaMs).toBeLessThan(LIMITE_MEDIANA_MS)
  })
})