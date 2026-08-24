export type Role = 'USER' | 'ADMIN'

export interface User {
  id: string
  email: string
  name: string
  password: string
  role: Role
  banned: boolean
  banReason: string | null
  bannedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type PublicUser = Omit<User, 'password'>
