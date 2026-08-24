import type { User } from './auth'

export interface AdminStats {
  users: {
    total: number
    banned: number
    newThisWeek: number
    admins: number
  }
  phones: {
    total: number
    inStock: number
    outOfStock: number
    verified: number
  }
  orders: {
    total: number
    pending: number
    confirmed: number
    shipped: number
    delivered: number
    cancelled: number
    revenue: number
    revenueThisMonth: number
  }
  revenueByDay: Array<{ date: string; amount: number; count: number }>
  recentOrders: Array<{
    id: string
    orderRef: string
    email: string
    name: string
    total: number
    status: string
    createdAt: string
    itemCount: number
  }>
}

export interface AdminUser extends User {
  banned: boolean
  banReason: string | null
  bannedAt: string | null
  orderCount: number
}
