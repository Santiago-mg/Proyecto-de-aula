import { describe, it, expect } from 'vitest'
import { updateProfile, getProfile } from '../../../src/application/use-cases/auth.use-cases'
import { UserRepository } from '../../../src/infrastructure/repositories/UserRepository'
import { updateProfileDto } from '../../../src/application/dtos/auth.dto'
import { prismaMock } from '../../helpers/prisma-mock'
import { ID_INEXISTENTE, errorRegistroNoEncontrado, usuario } from '../../helpers/fixtures'

// Basado en: auth.use-cases.ts — getProfile() y updateProfile()
//          + UserRepository.update() (traducción de P2025 a 404)

const repo = new UserRepository()

describe('getProfile', () => {
  it('devuelve el perfil sin la contraseña', async () => {
    const u = usuario({ name: 'Ana Pérez' })
    prismaMock.user.findUnique.mockResolvedValue(u)

    const perfil = await getProfile(repo, u.id)

    expect(perfil).toMatchObject({ id: u.id, name: 'Ana Pérez', email: u.email })
    expect(perfil).not.toHaveProperty('password')
  })

  it('lanza 404 si el usuario ya no existe', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)

    await expect(getProfile(repo, ID_INEXISTENTE)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Usuario no encontrado',
    })
  })
})

describe('updateProfile', () => {
  it('actualiza solo el nombre y devuelve el perfil sin la contraseña', async () => {
    // Arrange
    const u = usuario({ name: 'Ana Pérez' })
    prismaMock.user.update.mockResolvedValue({ ...u, name: 'Ana María Pérez' })

    // Act
    const perfil = await updateProfile(repo, u.id, { name: 'Ana María Pérez' })

    // Assert
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: u.id },
      data: { name: 'Ana María Pérez' },
    })
    expect(perfil.name).toBe('Ana María Pérez')
    expect(perfil).not.toHaveProperty('password')
  })

  it('traduce P2025 (usuario eliminado) a 404', async () => {
    prismaMock.user.update.mockRejectedValue(errorRegistroNoEncontrado())

    await expect(
      updateProfile(repo, ID_INEXISTENTE, { name: 'Nombre' }),
    ).rejects.toMatchObject({ statusCode: 404, message: 'Usuario no encontrado' })
  })

  it('propaga cualquier otro error de la base sin disfrazarlo de 404', async () => {
    prismaMock.user.update.mockRejectedValue(new Error('conexión perdida'))

    await expect(updateProfile(repo, 'u1', { name: 'Nombre' })).rejects.toThrow(
      'conexión perdida',
    )
  })
})

describe('updateProfileDto', () => {
  it('recorta los espacios del nombre', () => {
    const r = updateProfileDto.safeParse({ name: '  Ana  ' })
    expect(r.success && r.data.name).toBe('Ana')
  })

  it.each([
    ['vacío', ''],
    ['de una letra tras recortar', ' A '],
    ['de más de 80 caracteres', 'a'.repeat(81)],
  ])('rechaza un nombre %s', (_caso, name) => {
    expect(updateProfileDto.safeParse({ name }).success).toBe(false)
  })

  it('descarta role, email y banned: el perfil no puede cambiar la identidad ni el rol', () => {
    const r = updateProfileDto.safeParse({
      name: 'Ana',
      role: 'ADMIN',
      email: 'otra@gmail.com',
      banned: false,
    })
    expect(r.success && r.data).toEqual({ name: 'Ana' })
  })
})
