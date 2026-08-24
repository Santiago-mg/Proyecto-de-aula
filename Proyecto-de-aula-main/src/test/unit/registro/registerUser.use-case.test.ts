/**
 * Basado en el diagrama de flujo/grafo:
 *   Proceso 1. Registro de usuario — Escenario A
 *   Fuente real: src/application/use-csases/auth.use-cases.ts — registerUser()
 *
 * Caminos cubiertos (tabla de pruebas del PDF):
 *   1,2,3,4,F  -> exists = true  -> throw AppError('El email ya está registrado', 409)
 *   1,2,3,5,6,7,8,9,F -> exists = null -> hash + create + signToken -> { user, token }
 */
import { describe, it, expect, vi } from 'vitest'
import { registerUser } from '../../../src/application/use-cases/auth.use-cases'
import { AppError } from '../../../src/domain/AppError'
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

const baseUser: User = {
  id: 'user-1',
  email: 'nuevo@gmail.com',
  name: 'Nuevo Usuario',
  password: 'hashed-password',
  role: 'USER',
  banned: false,
  banReason: null,
  bannedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('registerUser() — Registro de usuario (caso de uso)', () => {
  it('Camino 1,2,3,4,F — email ya registrado: lanza AppError(409)', async () => {
    const repo = makeRepo({
      findByEmail: vi.fn().mockResolvedValue(baseUser),
    })

    await expect(
      registerUser(repo, {
        email: 'nuevo@gmail.com',
        name: 'Nuevo Usuario',
        password: 'password123',
      }),
    ).rejects.toMatchObject({
      message: 'El email ya está registrado',
      statusCode: 409,
    })

    expect(repo.create).not.toHaveBeenCalled()
  })

  it('Camino 1,2,3,5,6,7,8,9,F — email no registrado: crea usuario y retorna user + token', async () => {
    const repo = makeRepo({
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(baseUser),
    })

    const result = await registerUser(repo, {
      email: 'nuevo@gmail.com',
      name: 'Nuevo Usuario',
      password: 'password123',
    })

    // repo.create() se llamó con la contraseña ya hasheada (bcrypt), no en texto plano
    expect(repo.create).toHaveBeenCalledTimes(1)
    const createArg = (repo.create as any).mock.calls[0][0]
    expect(createArg.password).not.toBe('password123')
    expect(createArg.email).toBe('nuevo@gmail.com')

    // No debe exponer el password en la respuesta pública
    expect(result.user).not.toHaveProperty('password')
    expect(result.user.email).toBe('nuevo@gmail.com')

    // Debe generar un JWT válido (string no vacío con 3 partes)
    expect(typeof result.token).toBe('string')
    expect(result.token.split('.')).toHaveLength(3)
  })

  it('AppError() usa la firma real (mensaje, statusCode)', () => {
    const err = new AppError('mensaje de prueba', 418)
    expect(err.message).toBe('mensaje de prueba')
    expect(err.statusCode).toBe(418)
  })
})
