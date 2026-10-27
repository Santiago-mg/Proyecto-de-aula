/// <reference types="cypress" />

/** Usuario de prueba que devuelve la API simulada por cy.intercept. */
export const CLIENTE = {
  id: 'u-cliente',
  email: 'carla@gmail.com',
  name: 'Carla Rojas',
  role: 'USER' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
}

export const ADMIN = { ...CLIENTE, id: 'u-admin', email: 'admin@celularpro.co', name: 'Andrés Admin', role: 'ADMIN' as const }

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Deja una sesión iniciada en localStorage antes de cargar la app. */
      sesionComo(usuario: typeof CLIENTE | typeof ADMIN): Chainable<void>
      /** Responde con listas vacías a todo GET no programado (inicio, catálogo, pedidos). */
      apiVacia(): Chainable<void>
    }
  }
}

Cypress.Commands.add('sesionComo', (usuario) => {
  cy.window().then((win) => {
    win.localStorage.setItem('cp_token', `token-${usuario.id}`)
    win.localStorage.setItem('cp_user', JSON.stringify(usuario))
  })
})

Cypress.Commands.add('apiVacia', () => {
  cy.intercept('GET', '**/api/v1/**', {
    body: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } },
  })
})
