import type { AuthResponse, User } from '../types/auth'
import api from './api'

export const authService = {
  // ─── Registro e inicio de sesión ────────────────────────────────────────
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

  // ─── Gestión de perfil ──────────────────────────────────────────────────
  async me(): Promise<User> {
    const res = await api.get<{ data: User }>('/auth/me')
    return res.data.data
  },

  async updateProfile(data: { name: string }): Promise<User> {
    const res = await api.patch<{ data: User }>('/auth/me', data)
    return res.data.data
  },

  async changePassword(data: {
    currentPassword: string
    newPassword: string
  }): Promise<void> {
    await api.put('/auth/me/password', data)
  },
}
