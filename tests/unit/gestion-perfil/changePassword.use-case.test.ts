import { describe, it, expect } from 'vitest'
import { changePassword } from '../../../src/application/use-cases/auth.use-cases'
import { UserRepository } from '../../../src/infrastructure/repositories/UserRepository'
import { prismaMock } from '../../helpers/prisma-mock'
import { ID_INEXISTENTE, usuario } from '../../helpers/fixtures'

// Basado en: auth.use-cases.ts — changePassword()
//
// El doble de bcrypt de tests/setup.ts hashea como "hash:<texto>", así que se
// puede comprobar exactamente qué se escribió en la base.

const repo = new UserRepository()

describe('changePassword', () => {
  // Camino feliz
  it('guarda la contraseña nueva hasheada cuando la actual es correcta', async () => {
    // Arrange
    const u = usuario({ password: 'Actual123' })
    prismaMock.user.findUnique.mockResolvedValue(u)
    prismaMock.user.update.mockResolvedValue(u)

    // Act
    await changePassword(repo, u.id, {
      currentPassword: 'Actual123',
      newPassword: 'Nueva1234',
    })

    // Assert
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: u.id },
      data: { password: 'hash:Nueva1234' },
    })
  })

  it('nunca guarda la contraseña nueva en texto plano', async () => {
    const u = usuario({ password: 'Actual123' })
    prismaMock.user.findUnique.mockResolvedValue(u)
    prismaMock.user.update.mockResolvedValue(u)

    await changePassword(repo, u.id, { currentPassword: 'Actual123', newPassword: 'Nueva1234' })

    const guardada = prismaMock.user.update.mock.calls[0][0].data.password
    expect(guardada).not.toBe('Nueva1234')
  })

  // Contraseña actual incorrecta
  it('rechaza con 400 (no 401) si la contraseña actual no coincide', async () => {
    const u = usuario({ password: 'Actual123' })
    prismaMock.user.findUnique.mockResolvedValue(u)

    await expect(
      changePassword(repo, u.id, { currentPassword: 'Otra1234', newPassword: 'Nueva1234' }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'La contraseña actual no es correcta',
    })
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  // Usuario inexistente
  it('lanza 404 si el usuario ya no existe', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)

    await expect(
      changePassword(repo, ID_INEXISTENTE, { currentPassword: 'A1234567', newPassword: 'Nueva1234' }),
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })
})
