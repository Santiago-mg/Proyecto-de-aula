import { describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { prismaMock } from '../helpers/prisma-mock'
import { autenticar, autenticarAdmin, usuarioConConteo } from '../helpers/fixtures'

/**
 * ESC-26 — Banear usuario: valores límite del motivo, lo que se guarda y seguridad.
 * Complementa los 8 caminos básicos de esc-26-banear-usuario.test.ts.
 */

const RUTA = (id: string) => `/api/v1/admin/users/${id}/ban`

describe('ESC-26 — Banear usuario: ampliación', () => {
  it('un motivo de exactamente 4 caracteres es válido (valor límite) → 200', async () => {
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockResolvedValue(usuarioConConteo({ id: 'user-2', banned: true, banReason: 'spam' }))

    const res = await request(app).put(RUTA('user-2')).set('Authorization', `Bearer ${token}`).send({ reason: 'spam' })

    expect(res.status).toBe(200)
    expect(res.body.data.banReason).toBe('spam')
  })

  it('sin el campo reason → 400 indicando el campo que falta', async () => {
    const { token } = autenticarAdmin()

    const res = await request(app).put(RUTA('user-2')).set('Authorization', `Bearer ${token}`).send({})

    expect(res.status).toBe(400)
    expect(res.body.errors.map((e: { field: string }) => e.field)).toContain('reason')
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('guarda el motivo recibido y la fecha de la suspensión', async () => {
    const { token } = autenticarAdmin()
    prismaMock.user.update.mockResolvedValue(usuarioConConteo({ id: 'user-2', banned: true, banReason: 'fraude en pagos' }))

    await request(app).put(RUTA('user-2')).set('Authorization', `Bearer ${token}`).send({ reason: 'fraude en pagos' })

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { banned: true, banReason: 'fraude en pagos', bannedAt: expect.any(Date) } }),
    )
  })

  it('un administrador suspendido no puede banear a nadie → 403', async () => {
    const { token } = autenticar({ role: 'ADMIN', banned: true, banReason: 'auditoría' })

    const res = await request(app).put(RUTA('user-2')).set('Authorization', `Bearer ${token}`).send({ reason: 'motivo válido' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Tu cuenta ha sido suspendida. Motivo: auditoría')
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })
})
