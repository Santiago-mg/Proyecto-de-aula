import { beforeEach, describe, expect, it } from 'vitest'
import jwt from 'jsonwebtoken'
import { loginUser } from '../../../src/application/use-cases/auth.use-cases'
import { UserRepository } from '../../../src/infrastructure/repositories/UserRepository'
import { limpiarBaseDeDatos } from '../../helpers/db'
import { crearUsuario } from '../../helpers/fixtures'

// Basado en: application/use-cases/auth.use-cases.ts — loginUser()
//
// repo es el UserRepository real, y la contraseña que crearUsuario() guarda
// está hasheada con bcrypt de verdad (igual que hace registerUser en
// producción). loginUser() hace su propio bcrypt.compare() y jwt.sign() de
// verdad: nada de esto está simulado.

const repo = new UserRepository()

beforeEach(async () => {
  await limpiarBaseDeDatos()
})

describe('loginUser', () => {
  // Camino 1,2,3,4,F — email no registrado en BD
  it('lanza 401 "Credenciales inválidas" si el usuario no existe', async () => {
    await expect(
      loginUser(repo, { email: 'noexiste@correo.com', password: 'password123' }),
    ).rejects.toMatchObject({ message: 'Credenciales inválidas', statusCode: 401 })
  })

  // Camino 1,2,3,5,6,7,F — email existe, password incorrecto
  it('lanza 401 "Credenciales inválidas" si la contraseña no coincide', async () => {
    await crearUsuario({ email: 'user@correo.com', password: 'password123' })

    await expect(
      loginUser(repo, { email: 'user@correo.com', password: 'incorrecta' }),
    ).rejects.toMatchObject({ message: 'Credenciales inválidas', statusCode: 401 })
  })

  // Camino 1,2,3,5,6,8,9,F — credenciales correctas, cuenta baneada
  it('lanza 403 con el motivo cuando la cuenta está baneada', async () => {
    await crearUsuario({
      email: 'user@correo.com',
      password: 'password123',
      banned: true,
      banReason: 'Comportamiento fraudulento',
    })

    await expect(
      loginUser(repo, { email: 'user@correo.com', password: 'password123' }),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: expect.stringContaining('Comportamiento fraudulento'),
    })
  })

  // Camino 1,2,3,5,6,8,10,11,F — credenciales correctas, cuenta activa
  it('retorna user + token cuando las credenciales son válidas y la cuenta está activa', async () => {
    const creado = await crearUsuario({ email: 'user@correo.com', password: 'password123' })

    const result = await loginUser(repo, { email: 'user@correo.com', password: 'password123' })

    expect(result.user).not.toHaveProperty('password')
    expect(result.user.email).toBe('user@correo.com')

    // El token es un JWT real: se puede verificar con el mismo JWT_SECRET
    // y trae el id y el rol del usuario que acaba de iniciar sesión.
    const payload = jwt.verify(result.token, process.env.JWT_SECRET as string) as {
      id: string
      role: string
    }
    expect(payload.id).toBe(creado.id)
    expect(payload.role).toBe('USER')
  })
})
