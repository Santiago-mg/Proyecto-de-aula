import { describe, it } from 'vitest'
import { expect } from 'chai'
import {
  DOMINIOS_PERMITIDOS,
  MENSAJES_PASSWORD,
  dominioPermitido,
  normalizarEmail,
  problemasDePassword,
} from '../../src/domain/credenciales'
import { changePasswordDto, registerDto, updateProfileDto } from '../../src/application/dtos/auth.dto'
import { changePassword, loginUser, updateProfile } from '../../src/application/use-cases/auth.use-cases'
import { UserRepository } from '../../src/infrastructure/repositories/UserRepository'
import { prismaMock } from '../helpers/prisma-mock'
import { usuario } from '../helpers/fixtures'

/**
 * Aserciones fluidas con Chai (como el módulo JavaScript de
 * fluent-assertions-multilanguage) sobre registro, inicio de sesión,
 * validación de credenciales y gestión de perfil.
 *
 * Cada `expect(valor, 'contexto')` explica qué se verificaba si la prueba
 * falla, y las cadenas `.to...and...` agrupan condiciones del mismo valor.
 */

const repo = new UserRepository()

describe('Validación de credenciales — fluido', () => {
  it('la lista de dominios permitidos es exactamente la acordada con el frontend', () => {
    expect([...DOMINIOS_PERMITIDOS], 'dominios permitidos para registrarse')
      .to.have.lengthOf(5)
      .and.include.members(['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'])
  })

  it('normaliza el correo antes de compararlo', () => {
    expect(normalizarEmail('  Ana@GMAIL.com '), 'correo normalizado')
      .to.equal('ana@gmail.com')
      .and.not.match(/[A-Z\s]/)
    expect(dominioPermitido('ANA@Gmail.Com'), 'dominio con mayúsculas').to.be.true
  })

  it('describe todos los problemas de una contraseña débil', () => {
    expect(problemasDePassword('abc'), 'problemas de "abc"')
      .to.be.an('array')
      .that.has.lengthOf(3)
      .and.includes(MENSAJES_PASSWORD.corta)
      .and.does.not.include(MENSAJES_PASSWORD.minuscula)
  })
})

describe('Registro de usuario — fluido', () => {
  it('el DTO devuelve los datos ya limpios', () => {
    const r = registerDto.safeParse({
      email: ' Ana@Gmail.com',
      name: '  Ana Pérez ',
      password: 'Password123',
      role: 'ADMIN',
    })

    expect(r.success, 'registro válido').to.be.true
    if (r.success) {
      expect(r.data, 'datos del registro')
        .to.deep.equal({ email: 'ana@gmail.com', name: 'Ana Pérez', password: 'Password123' })
        .and.not.have.property('role')
    }
  })
})

describe('Inicio de sesión — fluido', () => {
  it('rechaza con AppError 401 y el mensaje genérico', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)

    const error = await loginUser(repo, { email: 'nadie@gmail.com', password: 'X1xxxxxx' }).catch(
      (e: unknown) => e,
    )

    expect(error, 'error del login').to.be.an.instanceOf(Error)
      .and.to.include({ statusCode: 401, message: 'Credenciales inválidas' })
  })

  it('entrega un token y el usuario público', async () => {
    prismaMock.user.findUnique.mockResolvedValue(usuario({ password: 'Password123' }))

    const r = await loginUser(repo, { email: 'ana@gmail.com', password: 'Password123' })

    expect(r, 'respuesta del login').to.have.all.keys('user', 'token')
    expect(r.user, 'usuario devuelto').to.not.have.property('password')
    expect(r.token, 'JWT').to.be.a('string').and.match(/^[\w-]+\.[\w-]+\.[\w-]+$/)
  })
})

describe('Gestión de perfil — fluido', () => {
  it('updateProfile devuelve el perfil público con el nombre nuevo', async () => {
    const u = usuario({ name: 'Ana' })
    prismaMock.user.update.mockResolvedValue({ ...u, name: 'Ana María' })

    const perfil = await updateProfile(repo, u.id, { name: 'Ana María' })

    expect(perfil, 'perfil actualizado')
      .to.include({ id: u.id, name: 'Ana María' })
      .and.not.have.property('password')
  })

  it('el DTO de perfil ignora todo lo que no sea el nombre', () => {
    const r = updateProfileDto.safeParse({ name: 'Ana', role: 'ADMIN', email: 'x@gmail.com' })
    expect(r.success && r.data, 'body del perfil').to.deep.equal({ name: 'Ana' })
  })

  it('changePassword explica por qué rechaza la contraseña actual', async () => {
    prismaMock.user.findUnique.mockResolvedValue(usuario({ password: 'Actual123' }))

    const error = await changePassword(repo, 'u1', {
      currentPassword: 'Mala12345',
      newPassword: 'Nueva1234',
    }).catch((e: unknown) => e)

    expect(error, 'error al cambiar la contraseña')
      .to.include({ statusCode: 400, message: 'La contraseña actual no es correcta' })
  })

  it('changePasswordDto marca el campo correcto cuando se repite la contraseña', () => {
    const r = changePasswordDto.safeParse({ currentPassword: 'Igual1234', newPassword: 'Igual1234' })
    expect(r.success, 'contraseña repetida').to.be.false
    if (!r.success) {
      expect(r.error.errors[0].path, 'campo señalado').to.deep.equal(['newPassword'])
    }
  })
})
