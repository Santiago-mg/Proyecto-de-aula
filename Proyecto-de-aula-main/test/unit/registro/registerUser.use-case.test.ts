import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { registerUser } from '../../../src/application/use-cases/auth.use-cases'
import { AppError } from '../../../src/domain/AppError'
import type { IUserRepository } from '../../../src/domain/repositories/IUserRepository'
import type { User } from '../../../src/domain/entities/User'

// Basado en: application/use-cases/auth.use-cases.ts — registerUser()

vi.mock('bcrypt', () => ({
  default: { hash: vi.fn(async () => 'hashed-password') },
}))

vi.mock('jsonwebtoken', () => ({
  default: { sign: vi.fn(() => 'fake-token') },
}))

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@gmail.com',
    name: 'Mario',
    password: 'hashed-password',
    role: 'USER',
    banned: false,
    banReason: null,
    bannedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeRepo(overrides: Partial<IUserRepository> = {}): IUserRepository {
  return {
    findByEmail: vi.fn(async () => null),
    findById: vi.fn(async () => null),
    create: vi.fn(async () => makeUser()),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('registerUser', () => {
  // Camino 1,2,3,4,5,F — email ya registrado en BD
  it('lanza AppError 409 cuando el email ya existe', async () => {
    const repo = makeRepo({ findByEmail: vi.fn(async () => makeUser()) })

    await expect(
      registerUser(repo, {
        email: 'user@gmail.com',
        name: 'Mario',
        password: 'password123',
      }),
    ).rejects.toMatchObject({
      message: 'El email ya está registrado',
      statusCode: 409,
    })

    expect(repo.create).not.toHaveBeenCalled()
  })

  it('el error lanzado es una instancia de AppError', async () => {
    const repo = makeRepo({ findByEmail: vi.fn(async () => makeUser()) })

    await expect(
      registerUser(repo, {
        email: 'user@gmail.com',
        name: 'Mario',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(AppError)
  })

  // Camino 1,2,3,4,6,7,8,9,F — email no registrado
  it('crea el usuario, hashea la contraseña y retorna user + token sin exponer el password', async () => {
    const created = makeUser()
    const repo = makeRepo({
      findByEmail: vi.fn(async () => null),
      create: vi.fn(async () => created),
    })

    const result = await registerUser(repo, {
      email: 'user@gmail.com',
      name: 'Mario',
      password: 'password123',
    })

    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12)
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@gmail.com',
        name: 'Mario',
        password: 'hashed-password',
      }),
    )
    expect(jwt.sign).toHaveBeenCalledWith(
      { id: created.id, role: created.role },
      expect.anything(),
      expect.anything(),
    )
    expect(result.token).toBe('fake-token')
    expect(result.user).not.toHaveProperty('password')
    expect(result.user.email).toBe('user@gmail.com')
  })
})
