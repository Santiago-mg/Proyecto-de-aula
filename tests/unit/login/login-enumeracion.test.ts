import { describe, it, expect, vi, afterEach } from 'vitest'
import bcrypt from 'bcrypt'
import { loginUser } from '../../../src/application/use-cases/auth.use-cases'
import { UserRepository } from '../../../src/infrastructure/repositories/UserRepository'
import { prismaMock } from '../../helpers/prisma-mock'
import { usuario } from '../../helpers/fixtures'

// Basado en: auth.use-cases.ts — loginUser()
//
// Si el correo no existe, el caso de uso compara igual contra un hash
// señuelo. Así un correo inexistente tarda lo mismo que uno existente con la
// contraseña equivocada y no se puede averiguar qué cuentas existen
// midiendo el tiempo de respuesta.

const repo = new UserRepository()

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loginUser — sin enumeración de usuarios', () => {
  it('ejecuta bcrypt.compare aunque el correo no exista', async () => {
    const compare = vi.spyOn(bcrypt, 'compare')
    prismaMock.user.findUnique.mockResolvedValue(null)

    await expect(
      loginUser(repo, { email: 'nadie@gmail.com', password: 'Cualquiera1' }),
    ).rejects.toMatchObject({ statusCode: 401 })

    expect(compare).toHaveBeenCalledTimes(1)
    expect(compare.mock.calls[0][1]).toMatch(/^\$2b\$12\$/)
  })

  it('responde exactamente igual a correo inexistente y a contraseña equivocada', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null)
    const inexistente = await loginUser(repo, {
      email: 'nadie@gmail.com',
      password: 'Cualquiera1',
    }).catch((e) => e)

    prismaMock.user.findUnique.mockResolvedValueOnce(usuario({ password: 'Correcta1' }))
    const equivocada = await loginUser(repo, {
      email: 'ana@gmail.com',
      password: 'Cualquiera1',
    }).catch((e) => e)

    expect({ s: inexistente.statusCode, m: inexistente.message }).toEqual({
      s: equivocada.statusCode,
      m: equivocada.message,
    })
  })

  it('a una cuenta suspendida con contraseña equivocada le responde 401, sin revelar la suspensión', async () => {
    prismaMock.user.findUnique.mockResolvedValue(
      usuario({ password: 'Correcta1', banned: true, banReason: 'fraude' }),
    )

    await expect(
      loginUser(repo, { email: 'ana@gmail.com', password: 'Equivocada1' }),
    ).rejects.toMatchObject({ statusCode: 401, message: 'Credenciales inválidas' })
  })
})
