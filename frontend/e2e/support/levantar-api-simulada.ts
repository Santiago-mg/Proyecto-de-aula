/**
 * Levanta solo la API simulada (puerto 3101) y la deja corriendo, para usarla
 * desde Cypress u otra herramienta:
 *
 *   npm run api:simulada
 *   npx cypress run --e2e --spec cypress/e2e/api --env API_URL=http://localhost:3101/api/v1
 */
import { PUERTO_API } from './config'
import { iniciarApiSimulada } from './api-simulada'

iniciarApiSimulada(PUERTO_API).then(() => {
  console.log(`API simulada de CelularPro en http://localhost:${PUERTO_API}/api/v1 (Ctrl+C para detener)`)
})
