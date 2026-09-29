import { expect } from 'chai'
import { describe, it } from 'vitest'
import { changeUserRole } from '../../../src/application/use-cases/admin.use-cases'
import { AdminRepository } from '../../../src/infrastructure/repositories/AdminRepository'
import { AppError } from '../../../src/domain/AppError'
import { prismaMock } from '../../helpers/prisma-mock'
import { usuarioConConteo } from '../../helpers/fixtures'
import { capturarError } from '../../helpers/errores'

// Basado en: application/use-cases/admin.use-cases.ts — changeUserRole()
//
// repo es el AdminRepository real: lo único que se reemplaza es el cliente
// Prisma. Así, si algún día el repositorio cambia de forma, esta prueba lo
// nota igual que lo notaría el código real.

const repo = new AdminRepository()

describe('changeUserRole', () => {
  // Camino 1,2,3,4,F — admin intenta cambiar su propio rol
  it('lanza AppError 400 y no modifica ningún registro si userId === requesterId', async () => {
    // Arrange
    const admin = usuarioConConteo({ role: 'ADMIN' })

    // Act
    const error = await capturarError(
      changeUserRole(repo, admin.id, { role: 'USER' }, admin.id),
    )

    // Assert
    expect(error).to.deep.include({
      message: 'No puedes cambiar tu propio rol',
      statusCode: 400,
    })

    // La guarda corta antes de tocar la base: ninguna escritura salió.
    expect(prismaMock.user.update.mock.calls).to.be.empty
  })

  it('el error lanzado es una instancia de AppError', async () => {
    // Arrange
    const admin = usuarioConConteo({ role: 'ADMIN' })

    // Act
    const error = await capturarError(
      changeUserRole(repo, admin.id, { role: 'USER' }, admin.id),
    )

    // Assert
    expect(error).to.be.instanceOf(AppError)
  })

  // Camino 1,2,3,5,6,F — admin cambia el rol de otro usuario
  it('cambia el rol de otro usuario cuando quien pide el cambio es un admin distinto', async () => {
    // Arrange
    const admin = usuarioConConteo({ role: 'ADMIN' })
    const otro = usuarioConConteo({ role: 'USER' })
    prismaMock.user.update.mockResolvedValue({ ...otro, role: 'ADMIN' })

    // Act
    const result = await changeUserRole(
      repo,
      otro.id,
      { role: 'ADMIN' },
      admin.id,
    )

    // Assert
    expect(result.id).to.equal(otro.id)
    expect(result.role).to.equal('ADMIN')
  })
})
