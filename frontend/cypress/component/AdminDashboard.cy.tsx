import { AdminDashboard } from '../../src/pages/admin/AdminDashboard'
import { ADMIN } from '../support/comandos'

// Componente: panel de administración — alerta de stock bajo.

const stats = {
  users: { total: 3, banned: 0, newThisWeek: 1, admins: 1 },
  phones: { total: 9, inStock: 8, outOfStock: 1, verified: 9 },
  orders: { total: 0, pending: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0, revenue: 0, revenueThisMonth: 0 },
  revenueByDay: [],
  recentOrders: [],
}

function alerta(id: string, tipo: 'LOW_STOCK' | 'OUT_OF_STOCK', nombre: string, stock: number, mensaje: string) {
  return {
    id, phoneId: `p-${id}`, type: tipo, message: mensaje, isResolved: false, createdAt: '2026-10-01T00:00:00.000Z',
    phone: { id: `p-${id}`, name: nombre, slug: id, stock, minStock: 5, heroImage: null },
  }
}

describe('<AdminDashboard /> — alertas de stock', () => {
  beforeEach(() => {
    window.localStorage.setItem('cp_token', 'tok')
    window.localStorage.setItem('cp_user', JSON.stringify(ADMIN))
    cy.intercept('GET', '**/auth/me', { body: { data: ADMIN } })
    cy.intercept('GET', '**/admin/stats', { body: { data: stats } })
  })

  afterEach(() => window.localStorage.clear())

  it('positivo: lista las alertas abiertas con su tipo y mensaje', () => {
    cy.intercept('GET', '**/admin/alerts', {
      body: {
        data: [
          alerta('a1', 'OUT_OF_STOCK', 'Xiaomi 13', 0, '"Xiaomi 13" se quedó sin unidades.'),
          alerta('a2', 'LOW_STOCK', 'iPhone 14', 2, '"iPhone 14" tiene 2 unidades, en o por debajo del mínimo de 5.'),
        ],
      },
    })

    cy.montar(<AdminDashboard />, { ruta: '/admin' })

    cy.get('[data-alertas-cargadas="true"]').should('exist')
    cy.get('[data-testid="stock-alerts"] li').should('have.length', 2)
    cy.get('[data-testid="stock-alerts"] li').first().should('contain.text', 'se quedó sin unidades')
    cy.get('[data-testid="stock-alerts"] li').last().should('contain.text', 'tiene 2 unidades')
  })

  it('negativo: sin alertas no muestra el panel', () => {
    cy.intercept('GET', '**/admin/alerts', { body: { data: [] } })

    cy.montar(<AdminDashboard />, { ruta: '/admin' })

    cy.get('[data-alertas-cargadas="true"]').should('exist')
    cy.get('[data-testid="stock-alerts"]').should('not.exist')
  })

  it('negativo: si /admin/alerts falla, el resto del panel sigue funcionando', () => {
    cy.intercept('GET', '**/admin/alerts', { statusCode: 500, body: { error: 'Error interno del servidor' } })

    cy.montar(<AdminDashboard />, { ruta: '/admin' })

    cy.get('[data-alertas-cargadas="true"]').should('exist')
    cy.get('h1').should('exist')
    cy.get('[data-testid="stock-alerts"]').should('not.exist')
  })
})
