import type { Order, OrderStatus } from '../entities/Order'

export interface CreateOrderData {
  userId?: string
  email: string
  name: string
  phone: string
  address: string
  city: string
  dept: string
  items: Array<{
    phoneId: string
    qty: number
    colorId?: string
    colorName?: string
  }>
}

export interface PaginatedOrders {
  data: Order[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface IOrderRepository {
  create(data: CreateOrderData): Promise<Order>
  findById(id: string): Promise<Order | null>
  findByUser(userId: string): Promise<Order[]>
  findAll(page: number, limit: number): Promise<PaginatedOrders>
  updateStatus(id: string, status: OrderStatus): Promise<Order>
}
