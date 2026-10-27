/// <reference types="cypress" />
import { ADMIN, CLIENTE } from '../../support/comandos'

/**
 * Regresión — recorridos en la aplicación completa (npm run dev) con la API
 * simulada por cy.intercept. Cada prueba protege un defecto corregido; si
 * vuelve a aparecer, la prueba falla. El número entre paréntesis es el de la
 * tabla de defectos del README general.
 */

describe('Regresión — defectos corregidos', () => {
  beforeEach(() => cy.apiVacia())

  it('(6) contraseña incorrecta: el error se ve y la página no se recarga', () => {
    cy.intercept('POST', '**/auth/login', { statusCode: 401, body: { error: 'Credenciales inválidas' } })
    cy.visit('/login')
    cy.window().then((w) => ((w as unknown as { marca: boolean }).marca = true))

    cy.get('#email').type('carla@gmail.com')
    cy.get('#password').type('Equivocada1')
    cy.contains('button', 'Ingresar').click()

    cy.get('[data-testid="error-servidor"]').should('have.text', 'Credenciales inválidas')
    cy.window().its('marca').should('eq', true) // misma página, sin recarga
  })

  it('(7) la sesión sobrevive a una recarga inmediata después de ingresar', () => {
    cy.intercept('POST', '**/auth/login', { body: { data: { user: CLIENTE, token: 'tok' } } })
    cy.intercept('GET', '**/auth/me', { body: { data: CLIENTE } })
    cy.visit('/login')
    cy.get('#email').type(CLIENTE.email)
    cy.get('#password').type('Segura123')
    cy.contains('button', 'Ingresar').click()
    cy.location('pathname').should('eq', '/dashboard')

    cy.reload()

    cy.location('pathname').should('eq', '/dashboard')
    cy.contains('h1', 'Hola, Carla').should('be.visible')
  })

  it('(8) si el rol cambió en el servidor, la app lo aplica al abrirse', () => {
    cy.intercept('GET', '**/auth/me', { body: { data: { ...ADMIN, role: 'USER' } } })
    cy.visit('/', { onBeforeLoad: (w) => {
      w.localStorage.setItem('cp_token', 'tok')
      w.localStorage.setItem('cp_user', JSON.stringify(ADMIN))
    } })

    cy.visit('/admin')

    cy.location('pathname').should('eq', '/unauthorized')
  })

  it('(9) una cuenta suspendida durante la sesión vuelve al login con el motivo', () => {
    cy.intercept('GET', '**/auth/me', { body: { data: CLIENTE } })
    cy.intercept('GET', '**/orders/my', { statusCode: 403, body: { error: 'Tu cuenta ha sido suspendida. Motivo: fraude' } })
    cy.visit('/dashboard', { onBeforeLoad: (w) => {
      w.localStorage.setItem('cp_token', 'tok')
      w.localStorage.setItem('cp_user', JSON.stringify(CLIENTE))
    } })

    cy.location('pathname').should('eq', '/login')
    cy.get('[data-testid="aviso-sesion"]').should('contain.text', 'Motivo: fraude')
  })

  it('(11) el enlace Admin lleva al panel con las alertas', () => {
    cy.intercept('GET', '**/auth/me', { body: { data: ADMIN } })
    cy.visit('/', { onBeforeLoad: (w) => {
      w.localStorage.setItem('cp_token', 'tok')
      w.localStorage.setItem('cp_user', JSON.stringify(ADMIN))
    } })

    cy.get('header a[href="/admin"]').should('be.visible')
  })

  it('interfaz: en 375 px la barra no se desborda y el menú incluye las acciones de cuenta', () => {
    cy.viewport(375, 812)
    cy.visit('/')

    cy.window().then((w) => {
      w.scrollTo(10_000, 0)
      expect(w.scrollX, 'desplazamiento horizontal').to.eq(0)
    })
    cy.get('.cp-show-mobile').filter(':visible').first().click()
    cy.contains('a', /registrarse/i).should('be.visible')
  })
})
