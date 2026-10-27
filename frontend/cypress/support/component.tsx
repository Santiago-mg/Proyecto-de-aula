/// <reference types="cypress" />
import { mount } from 'cypress/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from '../../src/context/AuthContext'
import { CartProvider } from '../../src/context/CartContext'
import { ToastProvider } from '../../src/context/ToastContext'
import '../../src/index.css'
import './comandos'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Monta un componente con los mismos proveedores que AppRouter, en la
       * ruta indicada. Las demás rutas muestran su path para comprobar
       * redirecciones (data-cy="ruta-destino"). Con patron '__rutas__', `ui`
       * son elementos <Route> (rutas anidadas, como AdminRoute + Outlet).
       */
      montar(ui: ReactNode, opciones?: { ruta?: string; patron?: string }): ReturnType<typeof mount>
    }
  }
}

function RutaActual() {
  return <p data-cy="ruta-destino">{useLocation().pathname}</p>
}

Cypress.Commands.add('montar', (ui, { ruta = '/', patron = ruta } = {}) =>
  mount(
    <MemoryRouter initialEntries={[ruta]}>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <Routes>
              {patron === '__rutas__' ? ui : <Route path={patron} element={ui} />}
              <Route path="*" element={<RutaActual />} />
            </Routes>
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  ),
)
