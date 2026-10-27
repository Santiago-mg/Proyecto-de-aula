import { defineConfig } from 'vitest/config'
import pendientesQa from './tests/pendiente-qa-mario.json'

// Corre SOLO las pruebas de la rama pruebas-qa-mario que verifican código que este
// back todavía no tiene (ver INTEGRACION-QA.md). Fallan a propósito hasta que se
// integre el código de Mario; mientras tanto no entran en `npm test`.
export default defineConfig({
  test: {
    include: pendientesQa,
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    env: { NODE_ENV: 'test', JWT_SECRET: 'secreto-solo-para-pruebas' },
    isolate: true,
  },
})
