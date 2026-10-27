import type { User } from '../entities/User'

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>
  findById(id: string): Promise<User | null>
  create(data: { email: string; name: string; password: string }): Promise<User>
  /** Lanza AppError 404 si el usuario no existe. */
  update(id: string, data: { name?: string; password?: string }): Promise<User>
}
