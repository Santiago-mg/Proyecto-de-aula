import { vi } from 'vitest'

/**
 * Doble de prueba del cliente Prisma.
 *
 * Solo se reemplaza la capa que habla con la base de datos. Todo lo demás
 * (rutas, auth.middleware, validate.middleware, controladores, casos de uso
 * y repositorios) se ejecuta de verdad, que es justamente lo que recorren los
 * grafos de flujo. Así cada camino se puede forzar con exactitud y sin
 * necesitar Postgres encendido.
 */
export const prismaMock = {
  user: {
    count: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  phone: {
    count: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  order: {
    count: vi.fn(),
    groupBy: vi.fn(),
    aggregate: vi.fn(),
    findMany: vi.fn(),
  },
  $connect: vi.fn(),
  $disconnect: vi.fn(),
}
