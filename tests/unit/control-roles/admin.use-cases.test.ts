import { beforeEach, describe, expect, it } from 'vitest'
import { changeUserRole } from '../../../src/application/use-cases/admin.use-cases'
import { AdminRepository } from '../../../src/infrastructure/repositories/AdminRepository'
import { limpiarBaseDeDatos } from '../../helpers/db'
import { crearUsuario } from '../../helpers/fixtures'

// Igual que control-roles/changeUserRole.use-case.test.ts, pero cubriendo
// también el caso de degradar de ADMIN a USER. Se deja como archivo aparte
// porque documenta ese camino con datos propios.

const repo = new AdminRepository()

beforeEach(async () => {
  await limpiarBaseDeDatos()
})

describe('changeUserRole', () => {
  it('promueve a un USER a ADMIN', async () => {
    const admin = await crearUsuario({ role: 'ADMIN' })
    const usuario = await crearUsuario({ role: 'USER' })

    const result = await changeUserRole(repo, usuario.id, { role: 'ADMIN' }, admin.id)

    expect(result.role).toBe('ADMIN')
  })

  it('rechaza que un admin cambie su propio rol', async () => {
    const admin = await crearUsuario({ role: 'ADMIN' })

    await expect(
      changeUserRole(repo, admin.id, { role: 'ADMIN' }, admin.id),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('degrada a un ADMIN a USER', async () => {
    const admin = await crearUsuario({ role: 'ADMIN' })
    const otroAdmin = await crearUsuario({ role: 'ADMIN' })

    const result = await changeUserRole(repo, otroAdmin.id, { role: 'USER' }, admin.id)

    expect(result.role).toBe('USER')
  })
})
