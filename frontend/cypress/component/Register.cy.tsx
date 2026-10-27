import { Register } from '../../src/pages/Register'
import { CLIENTE } from '../support/comandos'

// Componente: registro de usuario y validación de credenciales.

function llenar(datos: { nombre?: string; email?: string; password?: string; confirmar?: string }) {
  if (datos.nombre) cy.get('#name').type(datos.nombre)
  if (datos.email) cy.get('#email').type(datos.email)
  if (datos.password) cy.get('#password').type(datos.password)
  if (datos.confirmar) cy.get('#confirmPassword').type(datos.confirmar)
  cy.contains('button', 'Crear cuenta').click()
}

describe('<Register />', () => {
  beforeEach(() => {
    cy.intercept('POST', '**/auth/register', cy.spy().as('registroEspia'))
    cy.montar(<Register />, { ruta: '/register' })
  })

  it('muestra la política de contraseñas antes de escribir', () => {
    cy.get('#password-ayuda').should('have.text', 'Mínimo 8 caracteres, con mayúscula, minúscula y número')
  })

  it('negativo: vacío muestra los cuatro errores', () => {
    llenar({})
    cy.get('.cp-field-error').should('have.length', 4)
    cy.get('[aria-invalid="true"]').should('have.length', 4)
  })

  const debiles: Array<[string, string]> = [
    ['Corta1', 'La contraseña debe tener al menos 8 caracteres'],
    ['segura1234', 'La contraseña debe incluir al menos una letra mayúscula'],
    ['SEGURA1234', 'La contraseña debe incluir al menos una letra minúscula'],
    ['SeguraSegura', 'La contraseña debe incluir al menos un número'],
  ]
  debiles.forEach(([password, mensaje]) => {
    it(`negativo: rechaza "${password}"`, () => {
      llenar({ nombre: 'Carla Rojas', email: 'carla@gmail.com', password, confirmar: password })
      cy.get('#password-error').should('have.text', mensaje)
      cy.get('@registroEspia').should('not.have.been.called')
    })
  })

  it('negativo: rechaza un dominio no permitido', () => {
    llenar({ nombre: 'Carla Rojas', email: 'carla@empresa.com', password: 'Segura123', confirmar: 'Segura123' })
    cy.get('#email-error').should('have.text', 'Correo inválido. Usa Gmail, Outlook, Hotmail, Yahoo o iCloud.')
  })

  it('negativo: la confirmación debe coincidir', () => {
    llenar({ nombre: 'Carla Rojas', email: 'carla@gmail.com', password: 'Segura123', confirmar: 'Segura124' })
    cy.get('#confirmPassword-error').should('have.text', 'Las contraseñas no coinciden')
  })

  it('positivo: crea la cuenta con datos normalizados y lleva al panel', () => {
    cy.intercept('POST', '**/auth/register', { statusCode: 201, body: { data: { user: CLIENTE, token: 'tok' } } }).as('registro')

    llenar({ nombre: ' Carla Rojas ', email: 'Carla@Gmail.com', password: 'Segura123', confirmar: 'Segura123' })

    cy.wait('@registro')
      .its('request.body')
      .should('deep.equal', { email: 'carla@gmail.com', name: 'Carla Rojas', password: 'Segura123' })
    cy.get('[data-cy="ruta-destino"]').should('have.text', '/dashboard')
  })

  it('negativo: el correo ya registrado muestra el error del servidor', () => {
    cy.intercept('POST', '**/auth/register', { statusCode: 409, body: { error: 'El email ya está registrado' } })

    llenar({ nombre: 'Carla Rojas', email: 'carla@gmail.com', password: 'Segura123', confirmar: 'Segura123' })

    cy.get('[data-testid="error-servidor"]').should('have.text', 'El email ya está registrado')
  })
})
