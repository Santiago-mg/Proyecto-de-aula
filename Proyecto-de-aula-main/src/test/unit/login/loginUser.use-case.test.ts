/**
 * Basado en el diagrama de flujo/grafo:
 *   Proceso 2. Inicio de sesión — Escenario A
 *   Fuente real: src/application/use-cases/auth.use-cases.ts — loginUser()
 *
 * Caminos cubiertos (4, tal como en la tabla de pruebas del PDF):
 *   1,2,3,4,F               -> user === null              -> AppError 401
 *   1,2,3,5,6,7,F           -> password incorrecta         -> AppError 401
 *   1,2,3,5,6,8,9,F         -> credenciales ok, baneado     -> AppError 403
 *   1,2,3,5,6,8,10,11,F     -> credenciales ok, activo      -> { user, token }
 */
import { describe, it, expect, vi } from 'vitest'
import bcrypt from 'bcrypt'
import { loginUser } from '../../../src/application/use-cases/auth.use-cases'
import type { IUserRepository } from '../../../src/domain/repositories/IUserRepository'
import type { User } from '../../../src/domain/entities/User'

function makeRepo(overrides: Partial<IUserRepository> = {}): IUserRepository {
  return {
    findByEmail: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    ...overrides,
  } as unknown as IUserRepository
}

async function baseUser(overrides: Partial<User> = {}): Promise<User> {
  return {
    id: 'user-1',
    email: 'user@gmail.com',
    name: 'Usuario',
    password: await bcrypt.hash('password123', 4), // rounds bajos: tests rápidos
    role: 'USER',
    banned: false,
    banReason: null,
    bannedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('loginUser() — Inicio de sesión (caso de uso)', () => {
  it('Camino 1,2,3,4,F — email no registrado: AppError 401 "Credenciales inválidas"', async () => {
    const repo = makeRepo({ findByEmail: vi.fn().mockResolvedValue(null) })

    await expect(
      loginUser(repo, { email: 'no-existe@gmail.com', password: 'x' }),
    ).rejects.toMatchObject({ message: 'Credenciales inválidas', statusCode: 401 })
  })

  it('Camino 1,2,3,5,6,7,F — password incorrecta: AppError 401 "Credenciales inválidas"', async () => {
    const user = await baseUser()
    const repo = makeRepo({ findByEmail: vi.fn().mockResolvedValue(user) })

    await expect(
      loginUser(repo, { email: user.email, password: 'password-equivocado' }),
    ).rejects.toMatchObject({ message: 'Credenciales inválidas', statusCode: 401 })
  })

  it('Camino 1,2,3,5,6,8,9,F — credenciales correctas pero cuenta baneada: AppError 403 con el motivo', async () => {
    const user = await baseUser({ banned: true, banReason: 'Spam reiterado' })
    const repo = makeRepo({ findByEmail: vi.fn().mockResolvedValue(user) })

    await expect(
      loginUser(repo, { email: user.email, password: 'password123' }),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: expect.stringContaining('Spam reiterado'),
    })
  })

  it('Camino 1,2,3,5,6,8,10,11,F — credenciales correctas y cuenta activa: retorna user + token', async () => {
    const user = await baseUser()
    const repo = makeRepo({ findByEmail: vi.fn().mockResolvedValue(user) })

    const result = await loginUser(repo, { email: user.email, password: 'password123' })

    expect(result.user).not.toHaveProperty('password')
    expect(result.user.email).toBe(user.email)
    expect(typeof result.token).toBe('string')
    expect(result.token.split('.')).toHaveLength(3)
  })
})
