export type Condition = 'NEW' | 'CERTIFIED' | 'USED'

export interface PhoneColor {
  colorId: string
  name: string
  hex: string
}

export interface PhoneImage {
  url: string
  position: number
}

export interface PhoneListItem {
  id: string
  slug: string
  name: string
  brand: string
  price: number
  compareAt: number | null
  badge: string | null
  stock: number
  condition: Condition
  verified: boolean
  batteryHealth: number | null
  storage: string | null
  ram: string | null
  shortDesc: string | null
  heroImage: string | null
  category: string
}

export interface Phone extends PhoneListItem {
  categoryId: string
  camera: string | null
  battery: string | null
  screen: string | null
  chip: string | null
  longDesc: string | null
  images: PhoneImage[]
  colors: PhoneColor[]
  features: string[]
  createdAt: string
  updatedAt: string
}

export interface PaginatedPhones {
  data: PhoneListItem[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface PhonesQuery {
  page?: number
  limit?: number
  category?: string
  brand?: string
  condition?: Condition
  verified?: boolean
  minPrice?: number
  maxPrice?: number
  search?: string
}

// Formulario para crear/editar celular (admin)
export interface PhoneFormData {
  slug: string
  name: string
  brand: string
  categoryId: string
  price: number
  compareAt?: number
  badge?: string
  stock: number
  condition: Condition
  verified: boolean
  batteryHealth?: number
  ram?: string
  storage?: string
  camera?: string
  battery?: string
  screen?: string
  chip?: string
  shortDesc?: string
  longDesc?: string
  heroImage?: string
  features: string[]
}
