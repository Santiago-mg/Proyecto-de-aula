import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

/**
 * ESC-26 — Banear usuario
 * PUT /api/v1/admin/users/:id/ban
 *
 * Una prueba por cada camino básico del grafo de flujo.
 * V(G) = 7, así que son 7 caminos.
 *
 * La suite NO depende de una base de datos ni de variables de entorno:
 * - La capa de datos (Prisma) se reemplaza con un mock que nunca abre
 *   conexión ni lee DATABASE_URL.
 * - El secreto JWT se fija aquí mismo; nada se lee de .env.
 * - Los tokens se firman con 'jsonwebtoken' real sobre ese secreto.
 */

// ─── Entorno de prueba: sin .env ─────────────────────────────────
const TEST_JWT_SECRET = 'secreto-de-prueba-de-la-suite'
process.env.JWT_SECRET = TEST_JWT_SECRET

// ─── Mock de la capa de datos (se activa antes de importar app) ──
const { mockPrismaUserUpdate } = vi.hoisted(() => ({
  mockPrismaUserUpdate: vi.fn(),
}))

// El cliente real de Prisma nunca se instancia ni abre conexión.
vi.mock('@prisma/client', () => ({ Prisma: {} }))
vi.mock('../../src/infrastructure/database/prisma', () => ({
  default: { user: { update: mockPrismaUserUpdate } },
}))

import app from '../../src/app'

// ─── Identificadores y helpers de prueba ─────────────────────────
const ID_ADMIN = '11111111-1111-1111-1111-111111111111'
const ID_VICTIMA = '22222222-2222-2222-2222-222222222222'
const ID_INEXISTENTE = '00000000-0000-0000-0000-000000000000'

const RUTA = (id: string) => `/api/v1/admin/users/${id}/ban`
const MOTIVO = { reason: 'fraude en pagos' }

/** Firma un JWT real con el secreto de la suite, igual que lo haría el servidor. */
function tokenDe(persona: { id: string; role: 'USER' | 'ADMIN' }): string {
  return jwt.sign(persona, TEST_JWT_SECRET, { expiresIn: '1h' })
}

/** Token con una firma que no coincide con TEST_JWT_SECRET. */
function tokenConFirmaInvalida(): string {
  return jwt.sign({ id: ID_INEXISTENTE, role: 'ADMIN' }, 'secreto-equivocado')
}

beforeEach(() => {
  mockPrismaUserUpdate.mockReset()
})

describe('ESC-26 — Banear usuario', () => {
  it('Camino 1 (1-2-14): sin cabecera Bearer → 401 Token requerido', async () => {
    const res = await request(app).put(RUTA(ID_INEXISTENTE)).send(MOTIVO)

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token requerido')
    expect(mockPrismaUserUpdate).not.toHaveBeenCalled()
  })

  it('Camino 2 (1-3-4-14): firma inválida → 401 Token inválido o expirado', async () => {
    const res = await request(app)
      .put(RUTA(ID_INEXISTENTE))
      .set('Authorization', `Bearer ${tokenConFirmaInvalida()}`)
      .send(MOTIVO)

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token inválido o expirado')
    expect(mockPrismaUserUpdate).not.toHaveBeenCalled()
  })

  it('Camino 3 (1-3-5-6-14): rol USER → 403 Acceso restringido', async () => {
    const token = tokenDe({ id: ID_ADMIN, role: 'USER' })

    const res = await request(app)
      .put(RUTA(ID_ADMIN))
      .set('Authorization', `Bearer ${token}`)
      .send(MOTIVO)

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Acceso restringido a administradores')
    expect(mockPrismaUserUpdate).not.toHaveBeenCalled()
  })

  it('Camino 4 (1-3-5-7-8-14): reason con menos de 4 caracteres → 400 Datos inválidos', async () => {
    const token = tokenDe({ id: ID_ADMIN, role: 'ADMIN' })

    const res = await request(app)
      .put(RUTA(ID_ADMIN))
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'ab' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Datos inválidos')
    expect(mockPrismaUserUpdate).not.toHaveBeenCalled()
  })

  it('Camino 5 (1-3-5-7-9-10-14): un admin no puede banearse a sí mismo (RN-05) → 400', async () => {
    const token = tokenDe({ id: ID_ADMIN, role: 'ADMIN' })

    const res = await request(app)
      .put(RUTA(ID_ADMIN))
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'autobaneo de prueba' })

    // DEF-26-02 corregido: antes respondía 200 y el admin se dejaba fuera del panel.
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('No puedes banear tu propia cuenta')
    // La regla de negocio corta antes de tocar la capa de datos.
    expect(mockPrismaUserUpdate).not.toHaveBeenCalled()
  })

  it('Camino 6 (1-3-5-7-9-11-12-14): el id no existe → 404 Usuario no encontrado', async () => {
    const token = tokenDe({ id: ID_ADMIN, role: 'ADMIN' })
    mockPrismaUserUpdate.mockRejectedValue({ code: 'P2025' })

    const res = await request(app)
      .put(RUTA(ID_INEXISTENTE))
      .set('Authorization', `Bearer ${token}`)
      .send(MOTIVO)

    // DEF-26-01 corregido: antes el P2025 de Prisma salía como 500.
    expect(mockPrismaUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ID_INEXISTENTE } }),
    )
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Usuario no encontrado')
  })

  it('Camino 7 (1-3-5-7-9-11-13-14): datos correctos → 200 con el usuario baneado', async () => {
    const token = tokenDe({ id: ID_ADMIN, role: 'ADMIN' })
    const ahora = new Date()
    mockPrismaUserUpdate.mockResolvedValue({
      id: ID_VICTIMA,
      email: 'victima@correo.com',
      name: 'Víctima de prueba',
      role: 'USER',
      banned: true,
      banReason: MOTIVO.reason,
      bannedAt: ahora,
      createdAt: ahora,
      updatedAt: ahora,
      _count: { orders: 0 },
    })

    const res = await request(app)
      .put(RUTA(ID_VICTIMA))
      .set('Authorization', `Bearer ${token}`)
      .send(MOTIVO)

    expect(mockPrismaUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ID_VICTIMA },
        data: expect.objectContaining({
          banned: true,
          banReason: MOTIVO.reason,
          bannedAt: expect.any(Date),
        }),
      }),
    )
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      id: ID_VICTIMA,
      banned: true,
      banReason: MOTIVO.reason,
    })
    expect(res.body.data.bannedAt).not.toBeNull()
    // La contraseña nunca debe viajar en la respuesta.
    expect(res.body.data).not.toHaveProperty('password')
  })
})