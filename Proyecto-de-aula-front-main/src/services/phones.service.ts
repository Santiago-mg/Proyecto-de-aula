import type {
  PaginatedPhones,
  Phone,
  PhoneFormData,
  PhonesQuery,
} from '../types/phone'
import api from './api'

export const phonesService = {
  async getAll(query: PhonesQuery = {}): Promise<PaginatedPhones> {
    const res = await api.get<PaginatedPhones>('/phones', { params: query })
    return res.data
  },

  async getBySlug(slug: string): Promise<Phone> {
    const res = await api.get<{ data: Phone }>(`/phones/${slug}`)
    return res.data.data
  },

  async getById(id: string): Promise<Phone> {
    const res = await api.get<{ data: Phone }>(`/phones/id/${id}`)
    return res.data.data
  },

  async create(data: PhoneFormData): Promise<Phone> {
    const res = await api.post<{ data: Phone }>('/phones', data)
    return res.data.data
  },

  async update(id: string, data: Partial<PhoneFormData>): Promise<Phone> {
    const res = await api.put<{ data: Phone }>(`/phones/${id}`, data)
    return res.data.data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/phones/${id}`)
  },
}
