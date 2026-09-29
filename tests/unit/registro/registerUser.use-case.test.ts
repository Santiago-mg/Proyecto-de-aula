import { expect } from 'chai'
import { describe, it } from 'vitest'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { registerUser } from '../../../src/application/use-cases/auth.use-cases'
import { UserRepository } from '../../../src/infrastructure/repositories/UserRepository'
import { AppError } from '../../../src/domain/AppError'
import { prismaMock } from '../../helpers/prisma-mock'
import { usuario } from '../../helpers/fixtures'
import { capturarError } from '../../helpers/errores'

// Basado en: application/use-cases/auth.use-cases.ts — registerUser()
//
// repo es el UserRepository real. En vez de mirar la base, se comprueba lo
// que el caso de uso mandó a escribir: que la contraseña viaje hasheada y
// nunca en texto plano, y que el token firmado corresponda al usuario creado.

const repo = new UserRepository()

describe('registerUser', () => {
  // Camino 1,2,3,4,5,F — email ya registrado en BD
  it('lanza AppError 409 cuando el email ya existe', async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue(
      usuario({ email: 'user@correo.com' }),
    )

    // Act
    const error = await capturarError(
      registerUser(repo, {
        email: 'user@correo.com',
        name: 'Mario',
        password: 'password123',
      }),
    )

    // Assert
    expect(error).to.deep.include({
      message: 'El email ya está registrado',
      statusCode: 409,
    })

    expect(prismaMock.user.create.mock.calls).to.be.empty
  })

  it('el error lanzado es una instancia de AppError', async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue(
      usuario({ email: 'user@correo.com' }),
    )

    // Act
    const error = await capturarError(
      registerUser(repo, {
        email: 'user@correo.com',
        name: 'Mario',
        password: 'password123',
      }),
    )

    // Assert
    expect(error).to.be.instanceOf(AppError)
  })

  // Camino 1,2,3,4,6,7,8,9,F — email no registrado
  it('crea el usuario, hashea la contraseña con bcrypt y retorna user + token sin exponer el password', async () => {
    // Arrange
    const creado = usuario({
      email: 'user@correo.com',
      name: 'Mario',
      password: 'password123',
    })
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue(creado)

    // Act
    const result = await registerUser(repo, {
      email: 'user@correo.com',
      name: 'Mario',
      password: 'password123',
    })

    // Assert
    expect(result.user).to.not.have.property('password')
    expect(result.user.email).to.equal('user@correo.com')

    // La contraseña que se mandó a guardar va hasheada, no en texto plano.
    const guardado = prismaMock.user.create.mock.calls[0][0] as {
      data: { password: string }
    }
    expect(guardado.data.password).to.not.equal('password123')
    const coincide = await bcrypt.compare('password123', guardado.data.password)
    expect(coincide, 'la contraseña guardada corresponde a la original').to.be.true

    // El token es un JWT real, firmado con los datos del usuario recién creado.
    const payload = jwt.verify(
      result.token,
      process.env.JWT_SECRET as string,
    ) as { id: string; role: string }
    expect(payload.id).to.equal(creado.id)
    expect(payload.role).to.equal('USER')
  })
})
