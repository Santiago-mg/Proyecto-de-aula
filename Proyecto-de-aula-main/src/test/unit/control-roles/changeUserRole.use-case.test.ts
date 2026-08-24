/**
 * Basado en el diagrama de flujo/grafo:
 *   Proceso 5. Control de roles — Escenario B
 *   Fuente real: src/application/use-cases/admin.use-cases.ts — changeUserRole()
 *
 * Caminos cubiertos:
 *   1,2,3,4,F   -> userId === requesterId -> AppError('No puedes cambiar tu propio rol', 400)
 *   1,2,3,5,6,F -> userId !== requesterId -> repo.changeRole(userId, role)
 */
import { describe, it, expect, vi } from 'vitest'
import { changeUserRole } from '../../../src/application/use-cases/admin.use-cases'
import type { IAdminRepository } from '../../../src/domain/repositories/IAdminRepository'

function makeRepo(overrides: Partial<IAdminRepository> = {}): IAdminRepository {
  return {
    getStats: vi.fn(),
    listUsers: vi.fn(),
    banUser: vi.fn(),
    unbanUser: vi.fn(),
    changeRole: vi.fn(),
    ...overrides,
  } as unknown as IAdminRepository
}

describe('changeUserRole() — Cambio de rol de usuario (admin)', () => {
  it('Camino 1,2,3,4,F — admin intenta cambiar su propio rol: AppError 400', async () => {
    const repo = makeRepo()

    await expect(
      changeUserRole(repo, 'admin-1', { role: 'USER' }, 'admin-1'),
    ).rejects.toMatchObject({
      message: 'No puedes cambiar tu propio rol',
      statusCode: 400,
    })

    expect(repo.changeRole).not.toHaveBeenCalled()
  })

  it('Camino 1,2,3,5,6,F — admin cambia el rol de otro usuario: delega en repo.changeRole()', async () => {
    const updated = { id: 'u2', role: 'ADMIN' }
    const repo = makeRepo({ changeRole: vi.fn().mockResolvedValue(updated) })

    const result = await changeUserRole(repo, 'u2', { role: 'ADMIN' }, 'admin-1')

    expect(repo.changeRole).toHaveBeenCalledWith('u2', 'ADMIN')
    expect(result).toEqual(updated)
  })
})
