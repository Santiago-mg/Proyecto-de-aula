import type { IUserRepository } from '../../domain/repositories/IUserRepository'
import type { User } from '../../domain/entities/User'
import prisma from '../database/prisma'

export class UserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { email } })
    return user
  }

  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { id } })
    return user
  }

  async create(data: {
    email: string
    name: string
    password: string
  }): Promise<User> {
    const user = await prisma.user.create({ data })
    return user
  }
}
