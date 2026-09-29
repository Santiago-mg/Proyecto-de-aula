import { expect } from 'chai'
import { describe, it, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { authenticate } from '../../../src/interface/middlewares/auth.middleware'
import { prismaMock } from '../../helpers/prisma-mock'
import {
  ID_INEXISTENTE,
  generarToken,
  tokenConFirmaInvalida,
  usuario,
} from '../../helpers/fixtures'

// Basado en: interface/middlewares/auth.middleware.ts — authenticate()
//
// El middleware no se queda con lo que dice el token: después de verificar la
// firma va a la base a releer el estado vigente del usuario. Así, si a alguien
// lo banean o le bajan el rol, el cambio aplica de inmediato sin esperar a que
// expire la sesión. jwt.sign/jwt.verify son reales (generarToken() firma con
// el mismo JWT_SECRET que usa el servidor); lo único sustituido es la lectura
// de la fila, que es justo lo que cada caso necesita controlar.

function makeRes() {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res as Response
}

describe('authenticate middleware', () => {
  // Camino 1,2,3,F — sin header Authorization o sin prefijo Bearer
  it('responde 401 "Token requerido" si no hay header Authorization', async () => {
    // Arrange
    const req = { headers: {} } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    // Act
    await authenticate(req, res, next)

    // Assert
    expect(vi.mocked(res.status).mock.calls).to.deep.include([401])
    expect(vi.mocked(res.json).mock.calls).to.deep.include([{ error: 'Token requerido' }])
    expect(vi.mocked(next).mock.calls).to.be.empty
  })

  it('responde 401 "Token requerido" si el header no tiene el prefijo Bearer', async () => {
    // Arrange
    const req = { headers: { authorization: 'Token abc123' } } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    // Act
    await authenticate(req, res, next)

    // Assert
    expect(vi.mocked(res.status).mock.calls).to.deep.include([401])
    expect(vi.mocked(next).mock.calls).to.be.empty
  })

  // Camino 1,2,4,5,6,7,F — token presente pero inválido o expirado
  it('responde 401 "Token inválido o expirado" si la firma no corresponde al JWT_SECRET del servidor', async () => {
    // Arrange
    const req = {
      headers: { authorization: `Bearer ${tokenConFirmaInvalida()}` },
    } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    // Act
    await authenticate(req, res, next)

    // Assert
    expect(vi.mocked(res.status).mock.calls).to.deep.include([401])
    expect(vi.mocked(res.json).mock.calls).to.deep.include([{ error: 'Token inválido o expirado' }])
    expect(vi.mocked(next).mock.calls).to.be.empty
  })

  it('responde 401 "Token inválido o expirado" si el token ya venció', async () => {
    // Arrange
    const tokenVencido = jwt.sign({ id: ID_INEXISTENTE, role: 'USER' }, process.env.JWT_SECRET as string, {
      expiresIn: -1, // ya vencido al momento de firmarlo
    })
    const req = { headers: { authorization: `Bearer ${tokenVencido}` } } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    // Act
    await authenticate(req, res, next)

    // Assert
    expect(vi.mocked(res.status).mock.calls).to.deep.include([401])
    expect(vi.mocked(res.json).mock.calls).to.deep.include([{ error: 'Token inválido o expirado' }])
    expect(vi.mocked(next).mock.calls).to.be.empty
  })

  // Firma válida, pero el usuario ya no está en la base
  it('responde 401 si el token es válido pero el usuario ya no existe', async () => {
    // Arrange
    const token = jwt.sign({ id: ID_INEXISTENTE, role: 'USER' }, process.env.JWT_SECRET as string, {
      expiresIn: '1h',
    })
    prismaMock.user.findUnique.mockResolvedValue(null)

    const req = { headers: { authorization: `Bearer ${token}` } } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    // Act
    await authenticate(req, res, next)

    // Assert
    expect(vi.mocked(res.status).mock.calls).to.deep.include([401])
    expect(vi.mocked(next).mock.calls).to.be.empty
  })

  // Firma válida, pero la cuenta fue suspendida después de emitir el token
  it('responde 403 con el motivo si la cuenta está baneada', async () => {
    // Arrange
    const user = usuario({ banned: true, banReason: 'fraude en pagos' })
    prismaMock.user.findUnique.mockResolvedValue(user)
    const token = generarToken(user)

    const req = { headers: { authorization: `Bearer ${token}` } } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    // Act
    await authenticate(req, res, next)

    // Assert
    expect(vi.mocked(res.status).mock.calls).to.deep.include([403])
    const cuerpo = vi.mocked(res.json).mock.calls[0][0]
    expect(cuerpo).to.have.all.keys('error')
    expect(cuerpo.error).to.be.a('string').that.includes('fraude en pagos')
    expect(vi.mocked(next).mock.calls).to.be.empty
  })

  // Camino 1,2,4,5,6,8,9,F — token válido y cuenta activa
  it('asigna req.user y llama a next() si el token es válido', async () => {
    // Arrange
    const user = usuario()
    prismaMock.user.findUnique.mockResolvedValue(user)
    const token = generarToken(user)

    const req = { headers: { authorization: `Bearer ${token}` } } as Request
    const res = makeRes()
    const next = vi.fn() as NextFunction

    // Act
    await authenticate(req, res, next)

    // Assert
    expect(req.user).to.deep.include({ id: user.id, role: 'USER' })
    expect(vi.mocked(next).mock.calls).to.have.lengthOf(1)
    expect(vi.mocked(res.status).mock.calls).to.be.empty
  })

  // El rol se toma de la base, no del token: una degradación de ADMIN a USER
  // surte efecto sin esperar a que la sesión expire.
  it('usa el rol vigente en la base y no el que trae el token', async () => {
    // Arrange
    const user = usuario({ role: 'USER' })
    prismaMock.user.findUnique.mockResolvedValue(user)
    // El token quedó firmado como ADMIN antes de que lo degradaran a USER.
    const token = jwt.sign({ id: user.id, role: 'ADMIN' }, process.env.JWT_SECRET as string, {
      expiresIn: '1h',
    })

    const req = { headers: { authorization: `Bearer ${token}` } } as Request
    const next = vi.fn() as NextFunction

    // Act
    await authenticate(req, makeRes(), next)

    // Assert
    expect(req.user?.role).to.equal('USER')
    expect(vi.mocked(next).mock.calls).to.have.lengthOf(1)
  })
})
