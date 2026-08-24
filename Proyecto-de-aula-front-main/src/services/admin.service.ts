import type { AdminStats, AdminUser } from '../types/admin'
import type { Order } from '../types/order'
import api from './api'

export const adminService = {
  async getStats(): Promise<AdminStats> {
    const res = await api.get<{ data: AdminStats }>('/admin/stats')
    return res.data.data
  },

  async getUsers(page = 1, search?: string): Promise<{
    data: AdminUser[]
    meta: { total: number; page: number; totalPages: number }
  }> {
    const res = await api.get('/admin/users', { params: { page, limit: 20, search } })
    return res.data
  },

  async banUser(id: string, reason: string): Promise<AdminUser> {
    const res = await api.put<{ data: AdminUser }>(`/admin/users/${id}/ban`, { reason })
    return res.data.data
  },

  async unbanUser(id: string): Promise<AdminUser> {
    const res = await api.put<{ data: AdminUser }>(`/admin/users/${id}/unban`)
    return res.data.data
  },

  async changeRole(id: string, role: 'USER' | 'ADMIN'): Promise<AdminUser> {
    const res = await api.put<{ data: AdminUser }>(`/admin/users/${id}/role`, { role })
    return res.data.data
  },

  async getAllOrders(page = 1): Promise<{
    data: Order[]
    meta: { total: number; page: number; totalPages: number }
  }> {
    const res = await api.get('/orders', { params: { page, limit: 20 } })
    return res.data
  },

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const res = await api.put<{ data: Order }>(`/orders/${id}/status`, { status })
    return res.data.data
  },
}
