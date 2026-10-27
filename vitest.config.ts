import { defineConfig } from 'vitest/config'
import pendientesQa from './tests/pendiente-qa-mario.json'
import { RPReporter } from '@reportportal/agent-js-vitest'
import rp from './reportportal/config.cjs'

// ReportPortal (reportportal/LEEME.md): se suma solo si existe RP_API_KEY.
const reportePortal = rp.activo()
  ? [new RPReporter(rp.opciones('api-vitest', 'Backend: unitarias, escenarios de API, regresión, seguridad y rendimiento'))]
  : []

export default defineConfig({
  test: {
    // Toda la suite vive bajo tests/ para que no entre al build de producción.
    //   tests/escenarios  → pruebas de camino básico sobre la API completa
    //   tests/unit        → pruebas unitarias por caso de uso, middleware y DTO
    include: ['tests/**/*.test.ts'],

    // Pruebas de un compañero que verifican código que este back todavía no
    // tiene (ver tests/regresion/mario/README.md). Se corren a propósito con
    // vitest.pendiente.config.ts, no dentro de `npm test`.
    // La carga tiene su propia configuración (vitest.carga.config.ts).
    exclude: ['**/node_modules/**', 'tests/regresion/mario/pendiente-codigo-de-mario/**', 'tests/carga/**', ...pendientesQa],
    // pendientesQa: pruebas de la rama pruebas-qa-mario que esperan el código de Mario
    // (perfil, límite de intentos, cabeceras, reglas de contraseña). Se corren aparte
    // con `npm run test:pendiente-qa`; ver INTEGRACION-QA.md.

    environment: 'node',

    // En CI (Jenkins) también JUnit, que la etapa de pruebas publica
    reporters: ['default', ...(process.env.CI === 'true' ? ['junit'] : []), ...reportePortal],
    outputFile: { junit: 'reports/junit.xml' },

    // Instala el doble del cliente Prisma y el de bcrypt antes de que
    // cualquier repositorio los importe, y deja el doble en blanco entre
    // pruebas. La suite no necesita Postgres ni variables de entorno.
    setupFiles: ['tests/setup.ts'],

    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'secreto-solo-para-pruebas',
    },

    // Cada archivo corre en su propio entorno de módulos, así que su propio
    // doble de Prisma: lo que programa un archivo no se filtra a otro.
    isolate: true,

    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: [
        // seed.ts y el cliente Prisma: scripts de infraestructura que no
        // forman parte de la lógica bajo prueba.
        'src/infrastructure/database/**',
        'src/server.ts',
        // Solo declaran tipos e interfaces: al compilar no queda ninguna
        // línea ejecutable, así que siempre figurarían en 0% por más
        // pruebas que se escriban.
        'src/domain/entities/**',
        'src/domain/repositories/**',
      ],

      // SonarQube lee coverage/lcov.info (sonar.javascript.lcov.reportPaths).
      // Sin declarar 'lcov' aquí, Vitest usa sus reporters por defecto
      // (text, html, clover, json) y ese archivo NUNCA se genera, así que
      // Sonar no encuentra nada y reporta 0.0% de cobertura.
      reporter: ['text', 'lcov', 'html'],
    },
  },
})
