import type { Phone, PhoneListItem } from '../entities/Phone'

export interface PhoneFilters {
  category?: string
  brand?: string
  condition?: string
  verified?: boolean
  minPrice?: number
  maxPrice?: number
  search?: string
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

export interface IPhoneRepository {
  findAll(
    filters: PhoneFilters,
    page: number,
    limit: number,
  ): Promise<PaginatedPhones>
  findBySlug(slug: string): Promise<Phone | null>
  findById(id: string): Promise<Phone | null>
  create(data: Omit<Phone, 'id' | 'createdAt' | 'updatedAt'>): Promise<Phone>
  update(
    id: string,
    data: Partial<Omit<Phone, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Phone>
  delete(id: string): Promise<void>
}
