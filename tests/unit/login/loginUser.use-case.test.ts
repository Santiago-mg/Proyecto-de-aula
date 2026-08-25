import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcrypt'
import { loginUser } from '../../../src/application/use-cases/auth.use-cases'
import type { IUserRepository } from '../../../src/domain/repositories/IUserRepository'
import type { User } from '../../../src/domain/entities/User'

// Basado en: application/use-cases/auth.use-cases.ts — loginUser()

vi.mock('bcrypt', () => ({
  default: { compare: vi.fn(async () => true) },
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
    findByEmail: vi.fn(async () => makeUser()),
    findById: vi.fn(async () => null),
    create: vi.fn(async () => makeUser()),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('loginUser', () => {
  // Camino 1,2,3,4,F — email no registrado en BD
  it('lanza 401 "Credenciales inválidas" si el usuario no existe', async () => {
    const repo = makeRepo({ findByEmail: vi.fn(async () => null) })

    await expect(
      loginUser(repo, { email: 'noexiste@gmail.com', password: 'x' }),
    ).rejects.toMatchObject({ message: 'Credenciales inválidas', statusCode: 401 })
  })

  // Camino 1,2,3,5,6,7,F — email existe, password incorrecto
  it('lanza 401 "Credenciales inválidas" si la contraseña no coincide', async () => {
    ;(bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false)
    const repo = makeRepo()

    await expect(
      loginUser(repo, { email: 'user@gmail.com', password: 'incorrecta' }),
    ).rejects.toMatchObject({ message: 'Credenciales inválidas', statusCode: 401 })
  })

  // Camino 1,2,3,5,6,8,9,F — credenciales correctas, cuenta baneada
  it('lanza 403 con el motivo cuando la cuenta está baneada', async () => {
    const repo = makeRepo({
      findByEmail: vi.fn(async () =>
        makeUser({ banned: true, banReason: 'Comportamiento fraudulento' }),
      ),
    })

    await expect(
      loginUser(repo, { email: 'user@gmail.com', password: 'password123' }),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: expect.stringContaining('Comportamiento fraudulento'),
    })
  })

  // Camino 1,2,3,5,6,8,10,11,F — credenciales correctas, cuenta activa
  it('retorna user + token cuando las credenciales son válidas y la cuenta está activa', async () => {
    const repo = makeRepo()

    const result = await loginUser(repo, {
      email: 'user@gmail.com',
      password: 'password123',
    })

    expect(result.token).toBe('fake-token')
    expect(result.user).not.toHaveProperty('password')
    expect(result.user.email).toBe('user@gmail.com')
  })
})
