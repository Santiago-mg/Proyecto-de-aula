import { Profile } from '../../src/pages/Profile'
import { CLIENTE } from '../support/comandos'

// Componente: gestión de perfil (nombre y contraseña).

describe('<Profile />', () => {
  beforeEach(() => {
    window.localStorage.setItem('cp_token', 'tok')
    window.localStorage.setItem('cp_user', JSON.stringify(CLIENTE))
    cy.intercept('GET', '**/auth/me', { body: { data: CLIENTE } }).as('perfil')
    cy.montar(<Profile />, { ruta: '/profile' })
    cy.wait('@perfil')
  })

  afterEach(() => window.localStorage.clear())

  it('muestra el correo y el tipo de cuenta', () => {
    cy.get('[data-testid="perfil-email"]').should('have.text', 'carla@gmail.com')
    cy.get('[data-testid="perfil-rol"]').should('have.text', 'Cliente')
    cy.get('#profile-name').should('have.value', 'Carla Rojas')
  })

  it('positivo: guarda el nombre y confirma', () => {
    cy.intercept('PATCH', '**/auth/me', { body: { data: { ...CLIENTE, name: 'Valentina Rojas' } } }).as('guardar')

    cy.get('#profile-name').clear().type('Valentina Rojas')
    cy.contains('button', 'Guardar nombre').click()

    cy.wait('@guardar').its('request.body').should('deep.equal', { name: 'Valentina Rojas' })
    cy.contains('Nombre actualizado').should('be.visible')
  })

  it('negativo: el botón de guardar está deshabilitado sin cambios', () => {
    cy.contains('button', 'Guardar nombre').should('be.disabled')
  })

  it('positivo: cambia la contraseña y limpia el formulario', () => {
    cy.intercept('PUT', '**/auth/me/password', { statusCode: 204 }).as('clave')

    cy.get('#current-password').type('Segura123')
    cy.get('#new-password').type('Nueva4567')
    cy.get('#confirm-new-password').type('Nueva4567')
    cy.contains('button', 'Cambiar contraseña').click()

    cy.wait('@clave').its('request.body').should('deep.equal', { currentPassword: 'Segura123', newPassword: 'Nueva4567' })
    cy.get('[role="status"]').should('contain.text', 'Contraseña actualizada')
    cy.get('#current-password').should('have.value', '')
  })

  it('negativo: contraseña actual incorrecta muestra el error y no cierra la sesión', () => {
    cy.intercept('PUT', '**/auth/me/password', { statusCode: 400, body: { error: 'La contraseña actual no es correcta' } })

    cy.get('#current-password').type('Otra12345')
    cy.get('#new-password').type('Nueva4567')
    cy.get('#confirm-new-password').type('Nueva4567')
    cy.contains('button', 'Cambiar contraseña').click()

    cy.get('[data-testid="error-servidor"]').should('have.text', 'La contraseña actual no es correcta')
    cy.window().its('localStorage').invoke('getItem', 'cp_token').should('eq', 'tok')
  })
})
