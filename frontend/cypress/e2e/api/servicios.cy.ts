/// <reference types="cypress" />

/**
 * API — servicios de las seis funcionalidades con cy.request.
 *
 * Corre contra Cypress.env('API_URL'): el backend real (por defecto
 * http://localhost:3001/api/v1) o la API simulada de e2e/. Cada prueba crea
 * sus propias cuentas con correos únicos, así que se puede repetir.
 */

const api = (ruta: string) => `${Cypress.env('API_URL')}${ruta}`
const ADMIN = { email: 'admin@celularpro.co', password: 'admin1234' }
const correo = (n: string) => `${n}.cy.${Date.now()}${Math.floor(Math.random() * 1000)}@gmail.com`

function registrar(email = correo('carla'), password = 'Segura123', name = 'Carla Rojas') {
  return cy.request('POST', api('/auth/register'), { email, password, name }).then((r) => ({ ...r.body.data, email, password }))
}

function tokenAdmin() {
  return cy.request('POST', api('/auth/login'), ADMIN).its('body.data.token')
}

const conToken = (token: string) => ({ Authorization: `Bearer ${token}` })

describe('API — Registro de usuario', () => {
  it('positivo: 201 con usuario público y token', () => {
    const email = correo('registro')
    cy.request('POST', api('/auth/register'), { email, password: 'Segura123', name: 'Carla Rojas', role: 'ADMIN' }).then((r) => {
      expect(r.status).to.eq(201)
      expect(r.body.data.token).to.be.a('string')
      expect(r.body.data.user).to.include({ email, name: 'Carla Rojas', role: 'USER' })
      expect(r.body.data.user).not.to.have.property('password')
    })
  })

  it('negativo: 409 si el correo ya existe', () => {
    registrar().then(({ email }) => {
      cy.request({ method: 'POST', url: api('/auth/register'), body: { email, password: 'Segura123', name: 'Otra' }, failOnStatusCode: false })
        .then((r) => {
          expect(r.status).to.eq(409)
          expect(r.body.error).to.eq('El email ya está registrado')
        })
    })
  })

  it('negativo: 400 con el campo y la regla incumplida', () => {
    cy.request({ method: 'POST', url: api('/auth/register'), body: { email: 'x@empresa.com', password: 'debil', name: 'X' }, failOnStatusCode: false })
      .then((r) => {
        expect(r.status).to.eq(400)
        expect(r.body.errors.map((e: { field: string }) => e.field)).to.include.members(['email', 'password', 'name'])
      })
  })
})

describe('API — Inicio de sesión y validación de credenciales', () => {
  it('positivo: 200 con token, aunque el correo venga con mayúsculas', () => {
    registrar().then(({ email, password }) => {
      cy.request('POST', api('/auth/login'), { email: email.toUpperCase(), password }).then((r) => {
        expect(r.status).to.eq(200)
        expect(r.body.data.user.email).to.eq(email)
      })
    })
  })

  it('negativo: 401 con el mismo mensaje para contraseña incorrecta y correo inexistente', () => {
    registrar().then(({ email }) => {
      cy.request({ method: 'POST', url: api('/auth/login'), body: { email, password: 'Equivocada1' }, failOnStatusCode: false })
        .then((a) => {
          cy.request({ method: 'POST', url: api('/auth/login'), body: { email: correo('nadie'), password: 'Equivocada1' }, failOnStatusCode: false })
            .then((b) => {
              expect([a.status, b.status]).to.deep.eq([401, 401])
              expect(a.body).to.deep.eq(b.body)
            })
        })
    })
  })

  it('negativo: 401 sin token en una ruta protegida', () => {
    cy.request({ url: api('/auth/me'), failOnStatusCode: false }).its('status').should('eq', 401)
  })

  it('seguridad (solo backend real): el sexto intento fallido responde 429', function () {
    if (!Cypress.env('BACKEND_REAL')) this.skip()
    registrar().then(({ email }) => {
      const codigos: number[] = []
      Cypress._.times(6, (i) => {
        cy.request({ method: 'POST', url: api('/auth/login'), body: { email, password: `Mala${i}xxxx` }, failOnStatusCode: false })
          .then((r) => codigos.push(r.status))
      })
      cy.wrap(codigos).should('deep.equal', [401, 401, 401, 401, 401, 429])
    })
  })
})

describe('API — Gestión de perfil', () => {
  it('positivo: GET y PATCH /auth/me', () => {
    registrar().then(({ token }) => {
      cy.request({ url: api('/auth/me'), headers: conToken(token) }).its('body.data.name').should('eq', 'Carla Rojas')
      cy.request({ method: 'PATCH', url: api('/auth/me'), headers: conToken(token), body: { name: 'Valentina Rojas', role: 'ADMIN' } })
        .its('body.data')
        .should('include', { name: 'Valentina Rojas', role: 'USER' })
    })
  })

  it('positivo y negativo: cambio de contraseña', () => {
    registrar().then(({ token, email }) => {
      cy.request({ method: 'PUT', url: api('/auth/me/password'), headers: conToken(token), body: { currentPassword: 'Otra12345', newPassword: 'Nueva4567' }, failOnStatusCode: false })
        .its('status').should('eq', 400)
      cy.request({ method: 'PUT', url: api('/auth/me/password'), headers: conToken(token), body: { currentPassword: 'Segura123', newPassword: 'Nueva4567' } })
        .its('status').should('eq', 204)
      cy.request({ method: 'POST', url: api('/auth/login'), body: { email, password: 'Nueva4567' } }).its('status').should('eq', 200)
    })
  })
})

describe('API — Control de roles', () => {
  it('negativo: un cliente recibe 403 en /admin', () => {
    registrar().then(({ token }) => {
      for (const ruta of ['/admin/stats', '/admin/users', '/admin/alerts']) {
        cy.request({ url: api(ruta), headers: conToken(token), failOnStatusCode: false }).then((r) => {
          expect(r.status, ruta).to.eq(403)
          expect(r.body.error).to.eq('Acceso restringido a administradores')
        })
      }
    })
  })

  it('positivo: el admin promueve a un cliente y entonces accede', () => {
    registrar().then(({ token, email }) => {
      tokenAdmin().then((admin) => {
        cy.request({ url: api(`/admin/users?search=${encodeURIComponent(email)}`), headers: conToken(admin) }).then((r) => {
          const id = r.body.data.find((u: { email: string }) => u.email === email).id
          cy.request({ method: 'PUT', url: api(`/admin/users/${id}/role`), headers: conToken(admin), body: { role: 'ADMIN' } })
        })
      })
      cy.request({ url: api('/admin/stats'), headers: conToken(token) }).its('status').should('eq', 200)
    })
  })
})

describe('API — Alerta de stock bajo', () => {
  it('positivo y negativo: la alerta aparece al bajar del mínimo y se cierra al reponer', () => {
    tokenAdmin().then((admin) => {
      cy.request(api('/phones/iphone-13-usado')).its('body.data').then((celular: { id: string; name: string }) => {
        const alertasDelCelular = () =>
          cy.request({ url: api('/admin/alerts'), headers: conToken(admin) })
            .its('body.data')
            .then((data: Array<{ phoneId: string; type: string }>) => data.filter((a) => a.phoneId === celular.id))

        cy.request({ method: 'PUT', url: api(`/phones/${celular.id}`), headers: conToken(admin), body: { stock: 2, minStock: 5 } })
        alertasDelCelular().should('have.length', 1).its('0.type').should('eq', 'LOW_STOCK')

        cy.request({ method: 'PUT', url: api(`/phones/${celular.id}`), headers: conToken(admin), body: { stock: 0 } })
        alertasDelCelular().should('have.length', 1).its('0.type').should('eq', 'OUT_OF_STOCK')

        cy.request({ method: 'PUT', url: api(`/phones/${celular.id}`), headers: conToken(admin), body: { stock: 15 } })
        alertasDelCelular().should('have.length', 0)
      })
    })
  })
})
