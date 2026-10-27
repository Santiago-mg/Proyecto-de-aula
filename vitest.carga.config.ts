import { defineConfig } from 'vitest/config'
import { RPReporter } from '@reportportal/agent-js-vitest'
import rp from './reportportal/config.cjs'

// Cada escenario de carga es una prueba con sus criterios de aceptación como
// aserciones: en ReportPortal queda como launch propio para comparar corridas.
const reportePortal = rp.activo()
  ? [new RPReporter(rp.opciones('api-carga', 'Backend: escenarios de carga con autocannon (criterios de aceptación)'))]
  : []

// Pruebas de carga: fuera de `npm test` porque tardan ~1 minuto y sus
// tiempos dependen del equipo. Se ejecutan con `npm run test:carga`.
export default defineConfig({
  test: {
    include: ['tests/carga/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    env: { NODE_ENV: 'test', JWT_SECRET: 'secreto-solo-para-pruebas' },
    testTimeout: 180_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    reporters: ['default', ...reportePortal],
  },
})
