/**
 * Genera docs/pruebas/catalogo-pruebas.md (frontend) a partir de la evidencia
 * real de ejecución. Uso: node scripts/catalogo-pruebas.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const raiz = path.resolve(import.meta.dirname, '..')
const leer = (p) => JSON.parse(fs.readFileSync(path.join(raiz, p), 'utf8'))

const TIPOS = [
  ['test/unit/accesibilidad/', 'Accesibilidad de componentes', 'F-ACC'],
  ['test/unit/', 'Unitaria y de componentes (Testing Library)', 'F-UNI'],
  ['test/fluent/', 'Aserciones fluidas', 'F-FLU'],
  ['test/regression/', 'Regresión', 'F-REG'],
]

const escapar = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ')

/** Aserciones del bloque `it(...)` cuyo título coincide. */
function aserciones(archivo, titulo) {
  const lineas = fs.readFileSync(archivo, 'utf8').split('\n')
  const aRegex = (s) =>
    new RegExp('^' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%[sidfjo]/g, '[\\s\\S]*?').replace(/\\\$[\w.]+/g, '[\\s\\S]*?') + '$')
  let inicio = -1
  for (let i = 0; i < lineas.length && inicio < 0; i++) {
    const m = lineas[i].match(/\b(?:it|test)(?:\.each\([\s\S]*?\))?\(\s*['"`](.+?)['"`]\s*,/)
    if (m && (m[1] === titulo || aRegex(m[1]).test(titulo))) inicio = i
    else if (/\b(?:it|test)\.each\(/.test(lineas[i])) {
      // it.each([...])('título', ...) en varias líneas
      for (let j = i; j < Math.min(i + 25, lineas.length); j++) {
        const t =
          lineas[j].match(/\)\(\s*['"`](.+?)['"`]\s*,/) ||
          (/\)\(\s*$/.test(lineas[j - 1] ?? '') && lineas[j].match(/^\s*['"`](.+?)['"`]\s*,\s*$/))
        if (t && aRegex(t[1]).test(titulo)) { inicio = j; break }
      }
    }
  }
  if (inicio < 0) return []
  const sangria = lineas[inicio].match(/^\s*/)[0].length
  const encontradas = []
  for (let i = inicio + 1; i < lineas.length; i++) {
    const l = lineas[i]
    if (/^\s*(?:it|test|describe)(?:\.each)?\(/.test(l) && l.match(/^\s*/)[0].length <= sangria) break
    if (/expect(?:\.soft)?\(|\.rejects\.|toHaveBeenCalled/.test(l)) encontradas.push(l.trim())
  }
  return encontradas
}

function resumen(exps) {
  if (!exps.length) return 'Ver aserciones en el archivo'
  const mostradas = exps.slice(0, 3).map((e) => '`' + escapar(e.length > 110 ? e.slice(0, 107) + '...' : e) + '`')
  return mostradas.join('<br>') + (exps.length > 3 ? `<br>(+${exps.length - 3} aserciones más)` : '')
}


const existe = (p) => fs.existsSync(path.join(raiz, p))
let md = `# Catálogo de pruebas — Frontend CelularPro

Generado el ${new Date().toISOString().slice(0, 10)} con \`node scripts/catalogo-pruebas.mjs\` a partir
de la evidencia de ejecución (\`npm run test:evidencia\` y \`npm --prefix e2e run evidencias\`).

- **Objetivo:** lo que verifica la prueba.
- **Resultado esperado:** aserciones del código, pasos "Entonces" del escenario o comandos \`assert\` de Katalon.
- **Resultado obtenido:** estado en la última ejecución.
- **Evidencia:** reporte o captura indicada en cada sección.

`
const resumenFilas = []
let secciones = ''

// ── Vitest ────────────────────────────────────────────────────────────────
if (existe('docs/evidencias/unitarias/resultado.json')) {
  const unit = leer('docs/evidencias/unitarias/resultado.json')
  const grupos = new Map()
  for (const r of unit.testResults) {
    const rel = path.relative(raiz, r.name).replace(/\\/g, '/')
    const tipo = TIPOS.find(([p]) => rel.startsWith(p)) ?? ['', 'Otra', 'F-OTR']
    if (!grupos.has(tipo[1])) grupos.set(tipo[1], { prefijo: tipo[2], archivos: [] })
    grupos.get(tipo[1]).archivos.push({ rel, abs: r.name, pruebas: r.assertionResults })
  }
  for (const [tipo, { prefijo, archivos }] of grupos) {
    let n = 0
    let ok = 0
    secciones += `\n## ${tipo}\n\nEvidencia: \`docs/evidencias/unitarias/resultado.json\`.\n`
    for (const f of archivos.sort((a, b) => a.rel.localeCompare(b.rel))) {
      secciones += `\n### \`${f.rel}\`\n\n| ID | Objetivo | Resultado esperado | Obtenido |\n|---|---|---|---|\n`
      for (const t of f.pruebas) {
        n++
        if (t.status === 'passed') ok++
        const obtenido = t.status === 'passed' ? `Pasa (${Math.round(t.duration ?? 0)} ms)` : `**${t.status}**`
        secciones += `| ${prefijo}-${String(n).padStart(3, '0')} | ${escapar([...t.ancestorTitles, t.title].join(' › '))} | ${resumen(aserciones(f.abs, t.title))} | ${obtenido} |\n`
      }
    }
    resumenFilas.push(`| ${tipo} | Vitest + Testing Library | ${n} | ${ok} |`)
  }
}

// ── E2E Screenplay (Cucumber JSON) ────────────────────────────────────────
if (existe('docs/evidencias/e2e-screenplay/cucumber.json')) {
  const features = leer('docs/evidencias/e2e-screenplay/cucumber.json')
  const capturas = existe('docs/evidencias/e2e-screenplay/capturas') ? fs.readdirSync(path.join(raiz, 'docs/evidencias/e2e-screenplay/capturas')) : []
  const vistos = new Map()
  let n = 0
  let ok = 0
  secciones += `\n## E2E con el patrón Screenplay (Serenity/JS + Cucumber)\n\nEvidencia: \`docs/evidencias/e2e-screenplay/cucumber.json\` y una captura de la pantalla final por escenario en \`docs/evidencias/e2e-screenplay/capturas/\`.\n\n| ID | Característica | Objetivo (escenario) | Resultado esperado (Entonces) | Obtenido | Evidencia |\n|---|---|---|---|---|---|\n`
  for (const f of features) {
    for (const e of f.elements.filter((x) => x.type === 'scenario')) {
      n++
      const pasos = e.steps.filter((s) => !s.hidden && s.keyword.trim() !== 'Before' && s.keyword.trim() !== 'After')
      const iThen = pasos.findIndex((s) => s.keyword.trim() === 'Entonces')
      const esperado = pasos.slice(iThen).filter((s) => ['Entonces', 'Y'].includes(s.keyword.trim())).map((s) => `${s.keyword.trim()} ${s.name}`)
      const estados = e.steps.map((s) => s.result.status)
      const paso = estados.every((s) => s === 'passed')
      if (paso) ok++
      const nombre = `${path.basename(f.uri, '.feature')}--${e.name}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w-]+/g, '-').toLowerCase()
      const k = (vistos.get(nombre) ?? 0) + 1
      vistos.set(nombre, k)
      const prefijo = `${nombre}${k > 1 ? `-${k}` : ''}--`
      const captura = capturas.find((c) => c.startsWith(prefijo))
      const duracion = Math.round(e.steps.reduce((a, s) => a + (s.result.duration ?? 0), 0) / 1e6)
      secciones += `| F-E2E-${String(n).padStart(3, '0')} | ${escapar(f.name)} | ${escapar(e.name)} | ${escapar(esperado.join('<br>'))} | ${paso ? `Pasa (${pasos.length} pasos, ${duracion} ms)` : `**Falla** (${estados.filter((s) => s !== 'passed').join(', ')})`} | ${captura ? `[captura](../evidencias/e2e-screenplay/capturas/${captura})` : '—'} |\n`
    }
  }
  resumenFilas.push(`| E2E Screenplay | Serenity/JS + Cucumber + Playwright | ${n} | ${ok} |`)
}

// ── Katalon ───────────────────────────────────────────────────────────────
if (existe('docs/evidencias/katalon/resultado.json')) {
  const k = leer('docs/evidencias/katalon/resultado.json')
  let ok = 0
  secciones += `\n## E2E con Katalon Recorder\n\nSuite \`e2e/katalon/${k.suite}\`, ejecutada con el intérprete \`e2e/katalon/validar-suite.ts\`. Evidencia: \`docs/evidencias/katalon/resultado.json\` (resultado de cada comando) y una captura por caso.\n\n| ID | Objetivo (caso) | Resultado esperado (verificaciones) | Obtenido | Evidencia |\n|---|---|---|---|---|\n`
  k.casos.forEach((c, i) => {
    if (c.resultado === 'PASA') ok++
    const verif = c.pasos.filter((p) => /^(assert|waitForElementPresent \| xpath=\/\/h1)/.test(p.comando)).map((p) => '`' + escapar(p.comando.length > 100 ? p.comando.slice(0, 97) + '...' : p.comando) + '`')
    secciones += `| F-KAT-${String(i + 1).padStart(2, '0')} | ${c.caso} | ${verif.slice(0, 5).join('<br>')}${verif.length > 5 ? `<br>(+${verif.length - 5} más)` : ''} | ${c.resultado === 'PASA' ? `Pasa (${c.pasos.length} comandos, ${c.duracionMs} ms)` : `**Falla**: ${escapar(c.error)}`} | [captura](../evidencias/katalon/${c.captura}) |\n`
  })
  resumenFilas.push(`| E2E Katalon | Katalon Recorder (HTML) | ${k.casos.length} | ${ok} |`)
}

// ── Accesibilidad e interfaz ──────────────────────────────────────────────
for (const etapa of ['antes', 'despues']) {
  const p = `docs/evidencias/accesibilidad/${etapa}/resultado.json`
  if (!existe(p)) continue
  const a = leer(p)
  const total = a.pantallas.reduce((s, x) => s + x.violaciones.length, 0)
  secciones += `\n## Accesibilidad automatizada — ${etapa === 'antes' ? 'antes de corregir' : 'después de corregir'}\n\n${a.estandar}. Evidencia: \`${p}\` y capturas en la misma carpeta.\n\n| ID | Pantalla (rol) | Resultado esperado | Obtenido | Evidencia |\n|---|---|---|---|---|\n`
  a.pantallas.forEach((x, i) => {
    const v = x.violaciones.map((v) => `[${v.impacto}] ${v.regla} (${v.elementos.length})`).join('<br>')
    secciones += `| F-A11Y-${etapa === 'antes' ? 'A' : 'D'}${String(i + 1).padStart(2, '0')} | ${x.pantalla} \`${x.ruta}\` (${x.rol}) | 0 violaciones WCAG 2.1 A/AA | ${x.violaciones.length ? `**${x.violaciones.length} violaciones**<br>${v}` : `Pasa (${x.reglasEvaluadas} reglas evaluadas)`} | [captura](../evidencias/accesibilidad/${etapa}/${x.captura}) |\n`
  })
  if (etapa === 'despues') resumenFilas.push(`| Accesibilidad | axe-core (WCAG 2.1 AA) | ${a.pantallas.length} pantallas | ${a.pantallas.filter((x) => !x.violaciones.length).length} (${total} violaciones) |`)
}

if (existe('docs/evidencias/interfaz/resultado.json')) {
  const r = leer('docs/evidencias/interfaz/resultado.json')
  secciones += `\n## Interfaz\n\nEvidencia: \`docs/evidencias/interfaz/resultado.json\` y capturas.\n\n| ID | Objetivo | Resultado esperado | Obtenido | Evidencia |\n|---|---|---|---|---|\n`
  for (const c of r.casos) {
    const ev = c.evidencia.length > 2 ? `${c.evidencia.length} capturas \`${c.evidencia[0].split('_')[0]}*\`` : c.evidencia.map((e) => `[${e}](../evidencias/interfaz/${e})`).join('<br>')
    secciones += `| F-INT-${c.id} | ${escapar(c.objetivo)} | ${escapar(c.esperado)} | ${c.ok ? 'Pasa: ' : '**Falla:** '}${escapar(c.obtenido)} | ${ev} |\n`
  }
  resumenFilas.push(`| Interfaz | Playwright | ${r.casos.length} | ${r.casos.filter((c) => c.ok).length} |`)
}

// ── Cypress ───────────────────────────────────────────────────────────────
const junit = existe('docs/evidencias/cypress/junit') ? fs.readdirSync(path.join(raiz, 'docs/evidencias/cypress/junit')) : []
const specs = []
const recorrer = (d) => { for (const e of fs.readdirSync(path.join(raiz, d), { withFileTypes: true })) e.isDirectory() ? recorrer(`${d}/${e.name}`) : /\.cy\.tsx?$/.test(e.name) && specs.push(`${d}/${e.name}`) }
recorrer('cypress')
let nCy = 0
secciones += `\n## Cypress — componentes, API y regresión\n\n${junit.length ? `Evidencia: reportes JUnit en \`docs/evidencias/cypress/junit/\`, videos y capturas en \`docs/evidencias/cypress/\`.` : '**Pendiente de ejecución.** Ejecute `npm run cy:componentes`, `npm run cy:regresion` y `npm run cy:api` (ver docs/pruebas/01-regresion-api-componentes.md); Cypress guardará videos, capturas y reportes JUnit en `docs/evidencias/cypress/` y este catálogo los incluirá al regenerarse.'}\n\n| ID | Archivo | Objetivo | Resultado esperado |\n|---|---|---|---|\n`
for (const s of specs.sort()) {
  const lineas = fs.readFileSync(path.join(raiz, s), 'utf8').split('\n')
  lineas.forEach((l, i) => {
    const m = l.match(/^\s*it\(\s*['"`](.+?)['"`]/) || l.match(/^\s*it\(`(.+?)`/)
    if (!m) return
    nCy++
    const exps = []
    for (let j = i + 1; j < lineas.length && !/^\s*(it|describe)\(/.test(lineas[j]); j++) if (/\.should\(|expect\(/.test(lineas[j])) exps.push(lineas[j].trim())
    secciones += `| F-CY-${String(nCy).padStart(3, '0')} | \`${s}\` | ${escapar(m[1])} | ${resumen(exps)} |\n`
  })
}
resumenFilas.push(`| Cypress (componentes, API, regresión) | Cypress 14 | ${nCy} | ${junit.length ? 'ver JUnit' : 'pendiente de ejecución'} |`)

md += `## Resumen\n\n| Tipo | Herramienta | Pruebas | Pasan |\n|---|---|---:|---:|\n${resumenFilas.join('\n')}\n` + secciones
fs.mkdirSync(path.join(raiz, 'docs/pruebas'), { recursive: true })
fs.writeFileSync(path.join(raiz, 'docs/pruebas/catalogo-pruebas.md'), md)
console.log('Catálogo generado:\n' + resumenFilas.join('\n'))
