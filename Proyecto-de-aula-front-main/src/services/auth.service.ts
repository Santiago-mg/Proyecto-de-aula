import type { AuthResponse } from '../types/auth'
import api from './api'

export const authService = {
  async register(data: {
    email: string
    name: string
    password: string
  }): Promise<AuthResponse> {
    const res = await api.post<{ data: AuthResponse }>('/auth/register', data)
    return res.data.data
  },

  async login(data: {
    email: string
    password: string
  }): Promise<AuthResponse> {
    const res = await api.post<{ data: AuthResponse }>('/auth/login', data)
    return res.data.data
  },
}
