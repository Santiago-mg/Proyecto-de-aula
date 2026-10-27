/**
 * Ejecuta y verifica los cinco criterios de la rúbrica desde la raíz de
 * Proyecto-de-aula-mario. Levanta y detiene solo los servidores que cada
 * criterio necesita, y al final muestra un resumen.
 *
 *   npm run instalar            dependencias del backend, frontend y E2E
 *   npm run criterio1           regresión, API y componentes (incluye Cypress)
 *   npm run criterio2           seguridad y rendimiento
 *   npm run criterio3           accesibilidad e interfaz
 *   npm run criterio4           E2E con Screenplay
 *   npm run criterio5           E2E con Katalon (intérprete)
 *   npm run criterios           los cinco, en orden
 *   npm run katalon:servidores  deja la app corriendo para Katalon Recorder
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const raiz = path.resolve(import.meta.dirname, '..')
const win = process.platform === 'win32'
const API = 'http://localhost:3101/api/v1'
const FRONT = 'http://localhost:5173'
const resultados = []
const procesos = []

function ejecutar(criterio, etiqueta, cmd, args, { cwd = '.', env = {} } = {}) {
  console.log(`\n\x1b[36m▶ [Criterio ${criterio}] ${etiqueta}\x1b[0m\n  ${cmd} ${args.join(' ')}   (en ${cwd})`)
  const r = spawnSync(cmd, args, {
    cwd: path.join(raiz, cwd),
    stdio: 'inherit',
    shell: win,
    env: { ...process.env, ...env },
  })
  resultados.push({ criterio, etiqueta, ok: r.status === 0 })
  return r.status === 0
}

async function responde(url) {
  try {
    const r = await fetch(url)
    return r.status < 500
  } catch {
    return false
  }
}

async function levantar(etiqueta, url, cmd, args, { cwd, env = {} }) {
  if (await responde(url)) {
    throw new Error(`Ya hay algo escuchando en ${url}. Cierre esa terminal (Ctrl+C) y vuelva a intentarlo.`)
  }
  console.log(`\n  … levantando ${etiqueta}`)
  const p = spawn(cmd, args, {
    cwd: path.join(raiz, cwd),
    shell: win,
    detached: !win,
    stdio: 'ignore',
    env: { ...process.env, ...env },
  })
  procesos.push(p)
  const limite = Date.now() + 90_000
  while (Date.now() < limite) {
    if (await responde(url)) {
      console.log(`  ✓ ${etiqueta} lista en ${url}`)
      return
    }
    await new Promise((r) => setTimeout(r, 700))
  }
  throw new Error(`${etiqueta} no respondió en 90 s`)
}

function detenerServidores() {
  for (const p of procesos.splice(0)) {
    if (win) spawnSync('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' })
    else {
      try {
        process.kill(-p.pid, 'SIGTERM')
      } catch {
        // ya terminó
      }
    }
  }
}

const levantarApi = () => levantar('API simulada', `${API}/phones`, 'npm', ['run', 'api:simulada'], { cwd: 'frontend/e2e' })
const levantarFront = () =>
  levantar('Frontend (Vite)', FRONT, 'npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: 'frontend',
    env: { VITE_API_URL: API },
  })

// ─── Criterios ──────────────────────────────────────────────────────────

async function criterio1() {
  ejecutar(1, 'Backend: unitarias, API (Supertest) y regresión, con cobertura', 'npm', ['run', 'test:evidencia'])
  ejecutar(1, 'Frontend: componentes (Testing Library) y regresión', 'npm', ['run', 'test:evidencia'], { cwd: 'frontend' })
  ejecutar(1, 'Cypress: componentes', 'npm', ['run', 'cy:componentes'], { cwd: 'frontend' })
  try {
    await levantarApi()
    await levantarFront()
    ejecutar(1, 'Cypress: regresión', 'npm', ['run', 'cy:regresion'], { cwd: 'frontend' })
    ejecutar(1, 'Cypress: API', 'npx', ['cypress', 'run', '--e2e', '--spec', 'cypress/e2e/api', '--env', `API_URL=${API}`], { cwd: 'frontend' })
  } catch (e) {
    console.error(`\n✗ ${e.message}`)
    resultados.push({ criterio: 1, etiqueta: 'Servidores para Cypress', ok: false })
  } finally {
    detenerServidores()
  }
}

function criterio2() {
  ejecutar(2, 'Seguridad', 'npm', ['run', 'test:seguridad'])
  ejecutar(2, 'Carga con autocannon (≈1 minuto)', 'npm', ['run', 'test:carga'])
  const md = path.join(raiz, 'docs/evidencias/rendimiento/resultados-carga.md')
  if (fs.existsSync(md)) console.log('\n' + fs.readFileSync(md, 'utf8'))
}

function compilarFront(criterio) {
  return ejecutar(criterio, 'Compilar el frontend para las pruebas de navegador', 'npm', ['run', 'build:front'], { cwd: 'frontend/e2e' })
}

function criterio3() {
  ejecutar(3, 'Accesibilidad de componentes (Vitest)', 'npx', ['vitest', 'run', 'test/unit/accesibilidad'], { cwd: 'frontend' })
  if (!compilarFront(3)) return
  ejecutar(3, 'Accesibilidad WCAG 2.1 AA (axe-core)', 'npx', ['ts-node', 'calidad/accesibilidad.ts', 'despues'], { cwd: 'frontend/e2e' })
  ejecutar(3, 'Interfaz (adaptable, teclado, errores, retroalimentación)', 'npx', ['ts-node', 'calidad/interfaz.ts'], { cwd: 'frontend/e2e' })
}

function criterio4() {
  if (!compilarFront(4)) return
  const salida = path.join(raiz, 'frontend/docs/evidencias/e2e-screenplay')
  fs.rmSync(salida, { recursive: true, force: true })
  fs.mkdirSync(salida, { recursive: true })
  ejecutar(4, 'Screenplay: 26 escenarios (Serenity/JS + Cucumber)', 'npx', ['cucumber-js', '--format', `json:${path.join(salida, 'cucumber.json')}`], {
    cwd: 'frontend/e2e',
    env: { E2E_EVIDENCIA: 'true' },
  })
}

function criterio5() {
  if (!compilarFront(5)) return
  ejecutar(5, 'Katalon: suite de 6 casos (intérprete)', 'npx', ['ts-node', 'katalon/validar-suite.ts'], { cwd: 'frontend/e2e' })
  console.log('\n  Para la evidencia en Katalon Recorder: npm run katalon:servidores y Play Suite en la extensión.')
}

function catalogos() {
  ejecutar('—', 'Catálogo del backend', 'node', ['scripts/catalogo-pruebas.mjs'])
  ejecutar('—', 'Catálogo del frontend', 'node', ['scripts/catalogo-pruebas.mjs'], { cwd: 'frontend' })
}

function instalar() {
  ejecutar('—', 'Dependencias del backend', 'npm', ['ci'])
  ejecutar('—', 'Dependencias del frontend (incluye Cypress)', 'npm', ['ci'], { cwd: 'frontend' })
  ejecutar('—', 'Binario de Cypress', 'npx', ['cypress', 'install'], { cwd: 'frontend' })
  ejecutar('—', 'Dependencias de las E2E', 'npm', ['ci'], { cwd: 'frontend/e2e' })
  ejecutar('—', 'Navegador de Playwright', 'npx', ['playwright', 'install', 'chromium'], { cwd: 'frontend/e2e' })
}

async function katalonServidores() {
  await levantarApi()
  await levantarFront()
  console.log(`
  Listo. Con esta terminal abierta:
    1. Abra Katalon Recorder en Chrome.
    2. Open Test Suite → frontend\\e2e\\katalon\\Suite_CelularPro_6_funcionalidades.html
    3. Play Suite. Guarde capturas del resultado y del Log en frontend\\docs\\evidencias\\katalon\\
  La aplicación queda en ${FRONT} (admin@celularpro.co / admin1234).
  Ctrl+C para detener. Para repetir la suite desde cero, deténgala y vuelva a ejecutar este comando.`)
  await new Promise(() => {})
}

// ─── Inicio ─────────────────────────────────────────────────────────────

process.on('SIGINT', () => {
  detenerServidores()
  process.exit(130)
})

const accion = process.argv[2] ?? 'todos'
try {
  if (accion === 'instalar') instalar()
  else if (accion === 'servidores') await katalonServidores()
  else {
    const mapa = { 1: criterio1, 2: criterio2, 3: criterio3, 4: criterio4, 5: criterio5 }
    const lista = accion === 'todos' ? [1, 2, 3, 4, 5] : [Number(accion)]
    for (const n of lista) {
      if (!mapa[n]) throw new Error(`Criterio desconocido: ${accion}`)
      await mapa[n]()
    }
    catalogos()
  }
} catch (e) {
  console.error(`\n✗ ${e.message}`)
  detenerServidores()
  process.exit(1)
}

detenerServidores()
console.log('\n\x1b[1mResumen\x1b[0m')
for (const r of resultados) console.log(`  ${r.ok ? '\x1b[32m✓' : '\x1b[31m✗'}\x1b[0m [Criterio ${r.criterio}] ${r.etiqueta}`)
const fallos = resultados.filter((r) => !r.ok).length
console.log(fallos ? `\n${fallos} paso(s) con error. Revise la salida de arriba.` : '\nTodo correcto.')
process.exit(fallos ? 1 : 0)
