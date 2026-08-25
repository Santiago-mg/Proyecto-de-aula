import { describe, it, expect, vi } from 'vitest'
import { changeUserRole } from '../../../src/application/use-cases/admin.use-cases'
import { AppError } from '../../../src/domain/AppError'
import type { IAdminRepository } from '../../../src/domain/repositories/IAdminRepository'

// Basado en: application/use-cases/admin.use-cases.ts — changeUserRole()

function makeRepo(overrides: Partial<IAdminRepository> = {}): IAdminRepository {
  return {
    getStats: vi.fn(),
    listUsers: vi.fn(),
    banUser: vi.fn(),
    unbanUser: vi.fn(),
    changeRole: vi.fn(async () => ({ id: 'other-user', role: 'ADMIN' }) as any),
    ...overrides,
  }
}

describe('changeUserRole', () => {
  // Camino 1,2,3,4,F — admin intenta cambiar su propio rol
  it('lanza AppError 400 y no modifica ningún registro si userId === requesterId', async () => {
    const repo = makeRepo()

    await expect(
      changeUserRole(repo, 'admin-1', { role: 'USER' }, 'admin-1'),
    ).rejects.toMatchObject({
      message: 'No puedes cambiar tu propio rol',
      statusCode: 400,
    })

    expect(repo.changeRole).not.toHaveBeenCalled()
  })

  it('el error lanzado es una instancia de AppError', async () => {
    const repo = makeRepo()

    await expect(
      changeUserRole(repo, 'admin-1', { role: 'USER' }, 'admin-1'),
    ).rejects.toBeInstanceOf(AppError)
  })

  // Camino 1,2,3,5,6,F — admin cambia el rol de otro usuario
  it('delega en repo.changeRole cuando el admin cambia el rol de otro usuario', async () => {
    const repo = makeRepo()

    const result = await changeUserRole(repo, 'other-user', { role: 'ADMIN' }, 'admin-1')

    expect(repo.changeRole).toHaveBeenCalledWith('other-user', 'ADMIN')
    expect(result).toEqual({ id: 'other-user', role: 'ADMIN' })
  })
})
