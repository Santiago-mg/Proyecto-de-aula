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

export async function updateOrderStatus(
  repo: IOrderRepository,
  id: string,
  status: OrderStatus,
) {
  const order = await repo.findById(id)
  if (!order) throw new AppError('Orden no encontrada', 404)
  return repo.updateStatus(id, status)
}
