import { Login } from '../../src/pages/Login'
import { CLIENTE } from '../support/comandos'

// Componente: página de inicio de sesión (funcionalidades: inicio de sesión
// y validación de credenciales). La API se simula con cy.intercept.

describe('<Login />', () => {
  beforeEach(() => {
    cy.montar(<Login />, { ruta: '/login' })
  })

  it('muestra los campos con etiqueta y el botón Ingresar', () => {
    cy.get('label[for="email"]').should('contain.text', 'Email')
    cy.get('#email').should('have.attr', 'type', 'email')
    cy.get('label[for="password"]').should('contain.text', 'Contraseña')
    cy.get('#password').should('have.attr', 'type', 'password')
    cy.contains('button', 'Ingresar').should('be.enabled')
  })

  it('negativo: el formulario vacío marca los dos campos y no llama a la API', () => {
    cy.intercept('POST', '**/auth/login', cy.spy().as('login'))

    cy.contains('button', 'Ingresar').click()

    cy.get('#email').should('have.attr', 'aria-invalid', 'true')
    cy.get('#password-error').should('have.text', 'La contraseña es requerida')
    cy.get('@login').should('not.have.been.called')
  })

  it('positivo: envía el correo normalizado y lleva al panel', () => {
    cy.intercept('POST', '**/auth/login', { body: { data: { user: CLIENTE, token: 'tok' } } }).as('login')

    cy.get('#email').type('  Carla@Gmail.COM')
    cy.get('#password').type('Segura123')
    cy.contains('button', 'Ingresar').click()

    cy.wait('@login').its('request.body').should('deep.equal', { email: 'carla@gmail.com', password: 'Segura123' })
    cy.get('[data-cy="ruta-destino"]').should('have.text', '/dashboard')
    cy.window().its('localStorage').invoke('getItem', 'cp_token').should('eq', 'tok')
  })

  it('negativo: credenciales incorrectas muestran el error sin salir del formulario', () => {
    cy.intercept('POST', '**/auth/login', { statusCode: 401, body: { error: 'Credenciales inválidas' } })

    cy.get('#email').type('carla@gmail.com')
    cy.get('#password').type('Equivocada1')
    cy.contains('button', 'Ingresar').click()

    cy.get('[data-testid="error-servidor"]').should('have.text', 'Credenciales inválidas')
    cy.get('#email').should('have.value', 'carla@gmail.com')
  })

  it('negativo: una cuenta suspendida ve el motivo', () => {
    cy.intercept('POST', '**/auth/login', {
      statusCode: 403,
      body: { error: 'Tu cuenta ha sido suspendida. Motivo: fraude' },
    })

    cy.get('#email').type('carla@gmail.com')
    cy.get('#password').type('Segura123')
    cy.contains('button', 'Ingresar').click()

    cy.get('[data-testid="error-servidor"]').should('contain.text', 'Motivo: fraude')
  })
})
