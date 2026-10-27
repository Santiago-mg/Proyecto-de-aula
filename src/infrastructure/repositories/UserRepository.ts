import { Prisma } from '@prisma/client'
import { AppError } from '../../domain/AppError'
import { normalizarEmail } from '../../domain/credenciales'
import type { IUserRepository } from '../../domain/repositories/IUserRepository'
import type { User } from '../../domain/entities/User'
import prisma from '../database/prisma'

export class UserRepository implements IUserRepository {
  // La normalización también se aplica aquí, y no solo en el DTO, porque el
  // repositorio es la última barrera: cualquier llamada que no pase por
  // validate() (seed, scripts, otro caso de uso) busca y guarda igual.
  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email: normalizarEmail(email) },
    })
    return user as User | null
  }

  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { id } })
    return user as User | null
  }

  async create(data: {
    email: string
    name: string
    password: string
  }): Promise<User> {
    const user = await prisma.user.create({
      data: { ...data, email: normalizarEmail(data.email) },
    })
    return user as User
  }

  async update(
    id: string,
    data: { name?: string; password?: string },
  ): Promise<User> {
    try {
      const user = await prisma.user.update({ where: { id }, data })
      return user as User
    } catch (error) {
      // P2025: el usuario se eliminó entre la autenticación y la escritura.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new AppError('Usuario no encontrado', 404)
      }
      throw error
    }
  }
}
