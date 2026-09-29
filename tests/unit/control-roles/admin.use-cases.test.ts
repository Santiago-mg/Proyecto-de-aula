import { expect } from 'chai'
import { describe, it } from 'vitest'
import { changeUserRole } from '../../../src/application/use-cases/admin.use-cases'
import { AdminRepository } from '../../../src/infrastructure/repositories/AdminRepository'
import { consultaDe, prismaMock } from '../../helpers/prisma-mock'
import { usuarioConConteo } from '../../helpers/fixtures'
import { capturarError } from '../../helpers/errores'

// Igual que control-roles/changeUserRole.use-case.test.ts, pero cubriendo
// también el caso de degradar de ADMIN a USER. Se deja como archivo aparte
// porque documenta ese camino con datos propios.
//
// El repositorio es el AdminRepository de verdad: lo único sustituido es el
// cliente Prisma, así que el mapeo de la fila a AdminUser también se ejerce.

const repo = new AdminRepository()

describe('changeUserRole', () => {
  it('promueve a un USER a ADMIN', async () => {
    // Arrange
    const admin = usuarioConConteo({ role: 'ADMIN' })
    const usuario = usuarioConConteo({ role: 'USER' })
    prismaMock.user.update.mockResolvedValue({ ...usuario, role: 'ADMIN' })

    // Act
    const result = await changeUserRole(
      repo,
      usuario.id,
      { role: 'ADMIN' },
      admin.id,
    )

    // Assert
    expect(consultaDe(prismaMock.user.update)).to.deep.include({
      where: { id: usuario.id },
      data: { role: 'ADMIN' },
    })
    expect(result.role).to.equal('ADMIN')
  })

  it('rechaza que un admin cambie su propio rol', async () => {
    // Arrange
    const admin = usuarioConConteo({ role: 'ADMIN' })

    // Act
    const error = await capturarError(
      changeUserRole(repo, admin.id, { role: 'ADMIN' }, admin.id),
    )

    // Assert
    expect(error).to.deep.include({ statusCode: 400 })

    expect(prismaMock.user.update.mock.calls).to.be.empty
  })

  it('degrada a un ADMIN a USER', async () => {
    // Arrange
    const admin = usuarioConConteo({ role: 'ADMIN' })
    const otroAdmin = usuarioConConteo({ role: 'ADMIN' })
    prismaMock.user.update.mockResolvedValue({ ...otroAdmin, role: 'USER' })

    // Act
    const result = await changeUserRole(
      repo,
      otroAdmin.id,
      { role: 'USER' },
      admin.id,
    )

    // Assert
    expect(result.role).to.equal('USER')
  })
})
