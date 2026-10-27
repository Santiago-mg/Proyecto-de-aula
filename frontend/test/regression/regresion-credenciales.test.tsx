import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import api from '../../src/services/api'
import {
  DOMINIOS_PERMITIDOS,
  MENSAJE_DOMINIO,
  MENSAJES_PASSWORD,
  PASSWORD_MAX,
  PASSWORD_MIN,
} from '../../src/validation/credenciales'
import { Nav } from '../../src/components/layout/Nav'

/**
 * Regresión de credenciales y de los defectos corregidos en esta versión.
 *
 * Los valores de la primera sección son IDÉNTICOS a los que fija
 * tests/regression/regresion-credenciales.test.ts en el backend. Si una regla
 * cambia en un solo proyecto, una de las dos suites se rompe.
 */

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'a1', email: 'admin@celularpro.co', name: 'Mario Gómez', role: 'ADMIN', createdAt: '' },
    logout: vi.fn(),
  }),
}))
vi.mock('../../src/context/CartContext', () => ({ useCart: () => ({ totalItems: 0 }) }))

describe('Regresión — reglas alineadas con el backend', () => {
  it('regresion_dominios_permitidos_son_cinco', () => {
    expect(DOMINIOS_PERMITIDOS).toEqual(['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'])
  })

  it('regresion_longitud_de_contrasena_entre_8_y_72', () => {
    expect([PASSWORD_MIN, PASSWORD_MAX]).toEqual([8, 72])
  })

  it('regresion_mensajes_identicos_a_los_del_backend', () => {
    expect(MENSAJE_DOMINIO).toBe('Correo inválido. Usa Gmail, Outlook, Hotmail, Yahoo o iCloud.')
    expect(MENSAJES_PASSWORD.mayuscula).toBe('La contraseña debe incluir al menos una letra mayúscula')
  })
})

describe('Regresión — defectos corregidos', () => {
  beforeEach(() => {
    localStorage.setItem('cp_token', 't')
    delete (window as unknown as { location?: unknown }).location
    // @ts-expect-error - simplificación para el test
    window.location = { href: '' }
  })

  it('regresion_401_del_login_no_recarga_la_pagina', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rejected = (api.interceptors.response as any).handlers[0].rejected
    const error = { response: { status: 401, data: {} }, config: { url: '/auth/login' } }

    await expect(rejected(error)).rejects.toBe(error)
    expect(window.location.href).toBe('')
  })

  it('regresion_enlace_admin_lleva_al_dashboard_con_las_alertas_de_stock', () => {
    // Antes apuntaba a /admin/phones y el admin no veía las alertas al entrar.
    render(
      <MemoryRouter>
        <Nav onOpenCart={() => {}} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin')
  })
})
