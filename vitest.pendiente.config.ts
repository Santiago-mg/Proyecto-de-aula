import { defineConfig } from 'vitest/config'

// Corre SOLO las pruebas de Mario que verifican código que este back todavía
// no tiene (reglas de credenciales, perfil de usuario). Fallan a propósito
// hasta que ese código se porte; ver tests/regresion/mario/README.md.
export default defineConfig({
  test: {
    include: ['tests/regresion/mario/pendiente-codigo-de-mario/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    env: { NODE_ENV: 'test', JWT_SECRET: 'secreto-solo-para-pruebas' },
    isolate: true,
  },
})
