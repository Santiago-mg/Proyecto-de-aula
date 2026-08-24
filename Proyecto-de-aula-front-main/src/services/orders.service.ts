import type { CartItem, CheckoutFormData, Order } from '../types/order'
import api from './api'

export const ordersService = {
  async create(form: CheckoutFormData, cart: CartItem[]): Promise<Order> {
    const payload = {
      ...form,
      items: cart.map((item) => ({
        phoneId: item.phoneId,
        qty: item.qty,
        colorId: item.colorId,
        colorName: item.colorName,
      })),
    }
    const res = await api.post<{ data: Order }>('/orders', payload)
    return res.data.data
  },

  async getMyOrders(): Promise<Order[]> {
    const res = await api.get<{ data: Order[] }>('/orders/my')
    return res.data.data
  },

  async getAll(page = 1): Promise<{ data: Order[]; meta: { total: number; totalPages: number } }> {
    const res = await api.get('/orders', { params: { page, limit: 20 } })
    return res.data
  },

  async updateStatus(id: string, status: string): Promise<Order> {
    const res = await api.put<{ data: Order }>(`/orders/${id}/status`, {
      status,
    })
    return res.data.data
  },
}
