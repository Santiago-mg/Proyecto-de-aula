import { AppError } from '../../domain/AppError'
import type { OrderStatus } from '../../domain/entities/Order'
import type { IOrderRepository } from '../../domain/repositories/IOrderRepository'
import type { CreateOrderDto } from '../dtos/order.dto'

export async function createOrder(
  repo: IOrderRepository,
  data: CreateOrderDto,
  userId?: string,
) {
  return repo.create({ ...data, userId })
}

export async function getMyOrders(repo: IOrderRepository, userId: string) {
  return repo.findByUser(userId)
}

export async function getAllOrders(
  repo: IOrderRepository,
  page: number,
  limit: number,
) {
  return repo.findAll(page, limit)
}

// Flujo permitido del pedido. DELIVERED y CANCELLED son terminales: una vez
// entregado o cancelado, el pedido no vuelve atrás.
const TRANSICIONES_VALIDAS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

export async function updateOrderStatus(
  repo: IOrderRepository,
  id: string,
  status: OrderStatus,
) {
  const order = await repo.findById(id)
  if (!order) throw new AppError('Orden no encontrada', 404)

  // Sin esto, el endpoint acepta cualquier salto: un pedido entregado podía
  // volver a PENDING, o uno cancelado revivir como SHIPPED.
  if (order.status === status)
    throw new AppError(`La orden ya está en estado ${status}`, 400)

  const permitidos = TRANSICIONES_VALIDAS[order.status]

  if (!permitidos.includes(status)) {
    const detalle = permitidos.length
      ? `Desde ${order.status} solo puede pasar a: ${permitidos.join(', ')}.`
      : `${order.status} es un estado final y no admite cambios.`
    throw new AppError(`Transición de estado inválida. ${detalle}`, 400)
  }

  return repo.updateStatus(id, status)
}
