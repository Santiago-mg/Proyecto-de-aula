/**
 * Ejecuta la suite de regresión de las funcionalidades 13, 26, 27, 28, 29 y 30.
 *
 * Es el equivalente de run_all_tests.py del repositorio del curso: corre cada
 * categoría en un proceso aparte y al final muestra un resumen.
 *
 *   npm run test:regresion              las 4 categorías, las 6 funcionalidades
 *   npm run test:regresion -- esc-26    solo la funcionalidad 26, en las 4 categorías
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const RAIZ = 'tests/regresion/santiago'
const CATEGORIAS = [
  'regression-testing',
  'api-testing',
  'performance-testing',
  'security-testing',
]

const filtro = process.argv[2] ?? ''
const temporal = mkdtempSync(join(tmpdir(), 'regresion-'))
const resultados = []

for (const categoria of CATEGORIAS) {
  console.log(`\n${'='.repeat(70)}\nEjecutando ${categoria}${filtro ? ` (${filtro})` : ''}\n${'='.repeat(70)}`)

  const reporte = join(temporal, `${categoria}.json`)
  const proceso = spawnSync(
    'npx',
    [
      'vitest', 'run', `${RAIZ}/${categoria}/${filtro}`,
      '--reporter=verbose',
      '--reporter=json', `--outputFile.json=${reporte}`,
    ],
    // En Windows npx es un .cmd y solo se encuentra a través de la shell.
    { stdio: 'inherit', shell: process.platform === 'win32' },
  )

  let aprobadas = 0
  let fallidas = 0
  try {
    const datos = JSON.parse(readFileSync(reporte, 'utf8'))
    aprobadas = datos.numPassedTests
    fallidas = datos.numFailedTests
  } catch {
    // Sin reporte: vitest no llegó a correr (por ejemplo, el filtro no
    // coincide con ningún archivo). Cuenta como fallo.
  }
  resultados.push({ categoria, aprobadas, fallidas, ok: proceso.status === 0 })
}

rmSync(temporal, { recursive: true, force: true })

console.log(`\n${'='.repeat(70)}\nResumen${filtro ? ` (${filtro})` : ''}\n${'='.repeat(70)}`)
for (const { categoria, aprobadas, fallidas, ok } of resultados) {
  const detalle = fallidas > 0 ? `${aprobadas} passed, ${fallidas} failed` : `${aprobadas} passed`
  console.log(`${`${categoria}:`.padEnd(22)}${detalle.padStart(20)}${ok ? '' : '   ← ERROR'}`)
}
const total = resultados.reduce((suma, r) => suma + r.aprobadas, 0)
console.log(`${'Total:'.padEnd(22)}${`${total} passed`.padStart(20)}`)

const conErrores = resultados.filter((r) => !r.ok).map((r) => r.categoria)
if (conErrores.length > 0) {
  console.log(`\nCategorías con errores: ${conErrores.join(', ')}`)
  process.exit(1)
}
console.log('\nTodas las suites finalizaron correctamente.')
