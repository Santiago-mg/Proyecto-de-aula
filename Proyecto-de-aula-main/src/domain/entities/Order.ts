export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'

export interface OrderItem {
  id: number
  phoneId: string | null
  name: string
  heroImage: string | null
  price: number
  qty: number
  colorId: string | null
  colorName: string | null
}

export interface Order {
  id: string
  orderRef: string
  userId: string | null
  email: string
  name: string
  phone: string
  address: string
  city: string
  dept: string
  subtotal: number
  shipping: number
  total: number
  status: OrderStatus
  items: OrderItem[]
  createdAt: Date
  updatedAt: Date
}
