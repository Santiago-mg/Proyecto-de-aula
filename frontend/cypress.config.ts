import { defineConfig } from 'cypress'

/**
 * Cypress — regresión, API (servicios) y componentes.
 *
 *   npm run cy:componentes   Componentes React montados de forma aislada
 *                            (Vite). La API se simula con cy.intercept.
 *   npm run cy:regresion     Recorridos en la app con la API simulada por
 *                            cy.intercept. Requiere `npm run dev`.
 *   npm run cy:api           Servicios del backend con cy.request. Requiere el
 *                            backend real (puerto 3001) o la API simulada
 *                            (`npm --prefix e2e run api:simulada`).
 *
 * La evidencia (videos, capturas de fallos y reportes JUnit) queda en
 * docs/evidencias/cypress/.
 */
export default defineConfig({
  video: true,
  videosFolder: 'docs/evidencias/cypress/videos',
  screenshotsFolder: 'docs/evidencias/cypress/capturas',
  screenshotOnRunFailure: true,
  reporter: 'junit',
  reporterOptions: {
    mochaFile: 'docs/evidencias/cypress/junit/[suiteName]-[hash].xml',
    toConsole: false,
  },
  env: {
    API_URL: 'http://localhost:3001/api/v1',
    // true cuando API_URL apunta al backend real: activa las pruebas que
    // dependen de reglas que la API simulada no implementa (fuerza bruta).
    BACKEND_REAL: false,
  },
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: 1366,
    viewportHeight: 768,
  },
  component: {
    devServer: { framework: 'react', bundler: 'vite' },
    specPattern: 'cypress/component/**/*.cy.tsx',
    supportFile: 'cypress/support/component.tsx',
    viewportWidth: 1000,
    viewportHeight: 760,
  },
})
