import { Route } from 'react-router-dom'
import { AdminRoute } from '../../src/components/routes/AdminRoute'
import { ADMIN, CLIENTE } from '../support/comandos'

// Componente: control de roles en el frontend.

// AdminRoute es una ruta de diseño: protege a sus rutas hijas con <Outlet />.
const rutas = (
  <Route element={<AdminRoute />}>
    <Route path="/admin" element={<h1>Zona de administración</h1>} />
  </Route>
)
const montarProtegido = () => cy.montar(rutas, { ruta: '/admin', patron: '__rutas__' })

describe('<AdminRoute />', () => {
  afterEach(() => window.localStorage.clear())

  it('negativo: sin sesión redirige a /login', () => {
    montarProtegido()
    cy.get('[data-cy="ruta-destino"]').should('have.text', '/login')
  })

  it('negativo: un cliente es enviado a /unauthorized', () => {
    window.localStorage.setItem('cp_token', 'tok')
    window.localStorage.setItem('cp_user', JSON.stringify(CLIENTE))
    cy.intercept('GET', '**/auth/me', { body: { data: CLIENTE } })

    montarProtegido()

    cy.get('[data-cy="ruta-destino"]').should('have.text', '/unauthorized')
  })

  it('positivo: un administrador ve el contenido', () => {
    window.localStorage.setItem('cp_token', 'tok')
    window.localStorage.setItem('cp_user', JSON.stringify(ADMIN))
    cy.intercept('GET', '**/auth/me', { body: { data: ADMIN } })

    montarProtegido()

    cy.contains('h1', 'Zona de administración').should('be.visible')
  })

  it('regresión: si el servidor dice que ya no es admin, pierde el acceso', () => {
    window.localStorage.setItem('cp_token', 'tok')
    window.localStorage.setItem('cp_user', JSON.stringify(ADMIN))
    cy.intercept('GET', '**/auth/me', { body: { data: { ...ADMIN, role: 'USER' } } })

    montarProtegido()

    cy.get('[data-cy="ruta-destino"]').should('have.text', '/unauthorized')
  })
})
