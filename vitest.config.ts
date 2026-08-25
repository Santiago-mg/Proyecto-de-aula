import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Toda la suite vive bajo tests/ para que no entre al build de producción.
    //   tests/escenarios  → pruebas de camino básico sobre la API completa
    //   tests/unit        → pruebas unitarias por caso de uso, middleware y DTO
    include: ['tests/**/*.test.ts'],

    environment: 'node',

    // Reemplaza el cliente Prisma antes de que lo importe cualquier repositorio.
    setupFiles: ['tests/setup.ts'],

    // Variables que el código de producción espera encontrar. Se fijan aquí
    // para que la suite no dependa del .env de cada máquina.
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'secreto-solo-para-pruebas',
    },

    // Cada archivo corre en su propio entorno: los mocks de un archivo no se
    // filtran a otro. Es lo que permite que convivan los tres juegos de
    // pruebas, que simulan módulos distintos.
    isolate: true,

    // Se limpian las llamadas registradas, pero NO las implementaciones: los
    // vi.mock() de módulo definen su comportamiento una sola vez al cargarse.
    clearMocks: true,

    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/infrastructure/database/**', 'src/server.ts'],
    },
  },
})
