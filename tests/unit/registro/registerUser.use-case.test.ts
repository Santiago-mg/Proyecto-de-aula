import { beforeEach, describe, expect, it } from 'vitest'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { registerUser } from '../../../src/application/use-cases/auth.use-cases'
import { UserRepository } from '../../../src/infrastructure/repositories/UserRepository'
import { AppError } from '../../../src/domain/AppError'
import { limpiarBaseDeDatos } from '../../helpers/db'
import { crearUsuario } from '../../helpers/fixtures'

// Basado en: application/use-cases/auth.use-cases.ts — registerUser()
//
// repo es el UserRepository real. bcrypt.hash() y jwt.sign() también son
// reales: en vez de comprobar que se llamaron con ciertos argumentos (como
// haría un mock), se comprueba el resultado real que dejaron en la base y
// en el token.

const repo = new UserRepository()

beforeEach(async () => {
  await limpiarBaseDeDatos()
})

describe('registerUser', () => {
  // Camino 1,2,3,4,5,F — email ya registrado en BD
  it('lanza AppError 409 cuando el email ya existe', async () => {
    await crearUsuario({ email: 'user@correo.com' })

    await expect(
      registerUser(repo, { email: 'user@correo.com', name: 'Mario', password: 'password123' }),
    ).rejects.toMatchObject({ message: 'El email ya está registrado', statusCode: 409 })
  })

  it('el error lanzado es una instancia de AppError', async () => {
    await crearUsuario({ email: 'user@correo.com' })

    await expect(
      registerUser(repo, { email: 'user@correo.com', name: 'Mario', password: 'password123' }),
    ).rejects.toBeInstanceOf(AppError)
  })

  // Camino 1,2,3,4,6,7,8,9,F — email no registrado
  it('crea el usuario, hashea la contraseña con bcrypt y retorna user + token sin exponer el password', async () => {
    const result = await registerUser(repo, {
      email: 'user@correo.com',
      name: 'Mario',
      password: 'password123',
    })

    expect(result.user).not.toHaveProperty('password')
    expect(result.user.email).toBe('user@correo.com')

    // La contraseña quedó de verdad hasheada en la base, no en texto plano.
    const guardado = await repo.findByEmail('user@correo.com')
    expect(guardado?.password).not.toBe('password123')
    expect(await bcrypt.compare('password123', guardado!.password)).toBe(true)

    // El token es un JWT real, firmado con los datos del usuario recién creado.
    const payload = jwt.verify(result.token, process.env.JWT_SECRET as string) as {
      id: string
      role: string
    }
    expect(payload.id).toBe(guardado!.id)
    expect(payload.role).toBe('USER')
  })
})
