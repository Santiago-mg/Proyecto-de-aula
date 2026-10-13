import { prismaMock } from '../../../helpers/prisma-mock'

/**
 * Programa las 11 consultas que hace AdminRepository.getStats() (ESC-29), en
 * el mismo orden en que el repositorio las lanza:
 *
 *    1-4   user.count   total, baneados, nuevos de la semana, administradores
 *    5-7   phone.count  total, con stock, verificados
 *    8     order.groupBy por estado (conteo y suma de cada estado)
 *    9     order.aggregate de los ingresos del mes
 *   10     order.findMany de los 8 pedidos recientes
 *   11     order.findMany de los pedidos de los últimos 7 días
 *
 * Dentro de cada Promise.all las llamadas salen en el orden del arreglo, así
 * que los mockImplementationOnce encadenados quedan emparejados con su consulta.
 */

export type EstadoPedido =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'

export interface PedidosPorEstado {
  status: EstadoPedido
  count: number
  sum: number
}

export interface PedidoReciente {
  id: string
  orderRef: string
  email: string
  name: string
  total: number
  status: EstadoPedido
  createdAt: Date
  _count: { items: number }
}

/**
 * Las tandas en que getStats() lanza sus consultas: tres Promise.all
 * (usuarios, celulares, pedidos) y la consulta suelta de los últimos 7 días.
 */
export type TandaDelPanel = 'usuarios' | 'celulares' | 'pedidos' | 'semana'

export interface OpcionesEstadisticas {
  usuarios?: { total?: number; baneados?: number; nuevos?: number; admins?: number }
  celulares?: { total?: number; conStock?: number; verificados?: number }
  pedidos?: PedidosPorEstado[]
  /** null es lo que devuelve Prisma en `_sum` cuando no hay ningún pedido. */
  ingresosDelMes?: number | null
  recientes?: PedidoReciente[]
  ultimos7Dias?: Array<{ total: number; createdAt: Date }>
  /**
   * Si se indica, cada consulta se responde a través de esta función en vez
   * de resolverse al instante (ver baseConLatencia en medicion.ts). El
   * segundo argumento es la tanda a la que pertenece la consulta.
   */
  responder?: <T>(valor: T, grupo?: TandaDelPanel) => () => Promise<T>
}

export function programarEstadisticas(opciones: OpcionesEstadisticas = {}) {
  const usuarios = { total: 0, baneados: 0, nuevos: 0, admins: 0, ...opciones.usuarios }
  const celulares = { total: 0, conStock: 0, verificados: 0, ...opciones.celulares }
  const responder =
    opciones.responder ??
    (<T>(valor: T, _grupo?: TandaDelPanel) => () => Promise.resolve(valor))

  for (const valor of [usuarios.total, usuarios.baneados, usuarios.nuevos, usuarios.admins]) {
    prismaMock.user.count.mockImplementationOnce(responder(valor, 'usuarios'))
  }
  for (const valor of [celulares.total, celulares.conStock, celulares.verificados]) {
    prismaMock.phone.count.mockImplementationOnce(responder(valor, 'celulares'))
  }

  prismaMock.order.groupBy.mockImplementationOnce(
    responder(
      (opciones.pedidos ?? []).map((p) => ({
        status: p.status,
        _count: { _all: p.count },
        _sum: { total: p.sum },
      })),
      'pedidos',
    ),
  )
  prismaMock.order.aggregate.mockImplementationOnce(
    responder(
      { _sum: { total: opciones.ingresosDelMes === undefined ? 0 : opciones.ingresosDelMes } },
      'pedidos',
    ),
  )
  prismaMock.order.findMany
    .mockImplementationOnce(responder(opciones.recientes ?? [], 'pedidos'))
    .mockImplementationOnce(responder(opciones.ultimos7Dias ?? [], 'semana'))
}

/** Un pedido reciente con la forma que devuelve el findMany con _count.items. */
export function pedidoReciente(cambios: Partial<PedidoReciente> = {}): PedidoReciente {
  return {
    id: 'pedido-1',
    orderRef: 'CP-0001',
    email: 'ana@correo.com',
    name: 'Ana Torres',
    total: 3_000_000,
    status: 'DELIVERED',
    createdAt: new Date(),
    _count: { items: 2 },
    ...cambios,
  }
}
