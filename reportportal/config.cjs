// Configuración ÚNICA de ReportPortal para todas las suites de CelularPro.
//
// Se activa solo si existe RP_API_KEY. Sin ella, cada suite reporta como
// siempre (consola, JUnit) y nada intenta conectarse a un servidor: así
// `npm test` y el CI siguen funcionando aunque ReportPortal no esté levantado.
//
// Variables:
//   RP_API_KEY    clave del usuario (Perfil → API keys en ReportPortal)   [obligatoria]
//   RP_ENDPOINT   por defecto http://localhost:8080/api/v1
//   RP_PROJECT    por defecto celularpro
//   RP_LAUNCH     prefijo del nombre del launch, por defecto "CelularPro"
//   RP_RAMA       rama o versión que se está probando (atributo del launch)
//   RP_DEBUG      "true" para que el agente escriba en consola lo que envía

const atributosComunes = () => [
  { key: 'app', value: 'celularpro-api' },
  { key: 'rama', value: process.env.RP_RAMA || process.env.GIT_BRANCH || 'local' },
  // Las 6 funcionalidades del proyecto: permiten filtrar launches en ReportPortal
  { value: 'registro' }, { value: 'login' }, { value: 'perfil' },
  { value: 'credenciales' }, { value: 'roles' }, { value: 'alertas-stock' },
]

function activo() {
  return Boolean(process.env.RP_API_KEY)
}

function base() {
  return (process.env.RP_ENDPOINT || 'http://localhost:8080/api/v1').replace(/\/$/, '')
}

/**
 * Opciones para un agente de ReportPortal.
 * @param {string} suite  nombre corto de la suite: vitest, cypress-e2e, playwright-nexus…
 * @param {string} descripcion texto que aparece en el launch
 */
function opciones(suite, descripcion) {
  return {
    apiKey: process.env.RP_API_KEY || '',  // solo se usa si activo() es true
    endpoint: base(),
    project: process.env.RP_PROJECT || 'celularpro',
    launch: `${process.env.RP_LAUNCH || 'CelularPro'} · ${suite}`,
    description: descripcion,
    attributes: [{ key: 'suite', value: suite }, ...atributosComunes()],
    // Las pruebas omitidas no se marcan "To Investigate": no son fallos que analizar
    skippedIssue: false,
    debug: process.env.RP_DEBUG === 'true',
  }
}

module.exports = { activo, base, opciones, atributosComunes }
