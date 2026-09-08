import { config } from 'dotenv'
import { defineConfig } from 'vitest/config'

// Carga .env.test (no .env) antes de que arranque cualquier prueba, para que
// DATABASE_URL apunte a la base de pruebas y no a la compartida del equipo.
config({ path: '.env.test' })

export default defineConfig({
  test: {
    // Toda la suite vive bajo tests/ para que no entre al build de producción.
    //   tests/escenarios  → pruebas de camino básico sobre la API completa
    //   tests/unit        → pruebas unitarias por caso de uso, middleware y DTO
    include: ['tests/**/*.test.ts'],

    environment: 'node',

    // Corre la comprobación de seguridad de DATABASE_URL y cierra la
    // conexión de Prisma al final de cada archivo.
    setupFiles: ['tests/setup.ts'],

    // JWT_SECRET no depende del .env de cada máquina; DATABASE_URL sí, y se
    // carga arriba desde .env.test.
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'secreto-solo-para-pruebas',
    },

    // Todos los archivos comparten la misma base de datos real, así que
    // corren uno detrás del otro y no en paralelo. Si dos archivos
    // corrieran a la vez, el beforeEach de uno podría borrar los datos que
    // el otro acababa de insertar.
    fileParallelism: false,

    // Cada archivo corre en su propio entorno de módulos, así que su propio
    // cliente Prisma. No hay mocks de módulo que necesiten sobrevivir entre
    // archivos, pero mantiene los archivos totalmente independientes entre sí.
    isolate: true,

    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/infrastructure/database/**', 'src/server.ts'],
    },
  },
})
