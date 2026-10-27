/**
 * Genera docs/pruebas/catalogo-pruebas.md a partir de la evidencia real:
 *   - docs/evidencias/unitarias/resultado.json  (npm run test:evidencia)
 *   - docs/evidencias/rendimiento/resultados-carga.json  (npm run test:carga)
 *
 * Para cada prueba: objetivo (su nombre), resultado esperado (las aserciones
 * que contiene, extraídas del código), resultado obtenido (estado y duración
 * del reporte) y evidencia (archivo del reporte).
 *
 * Uso: node scripts/catalogo-pruebas.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const raiz = path.resolve(import.meta.dirname, '..')
const leer = (p) => JSON.parse(fs.readFileSync(path.join(raiz, p), 'utf8'))

const TIPOS = [
  ['tests/unit/', 'Unitaria', 'B-UNI'],
  ['tests/escenarios/', 'API (Supertest)', 'B-API'],
  ['tests/fluent/', 'Aserciones fluidas', 'B-FLU'],
  ['tests/regression/', 'Regresión', 'B-REG'],
  ['tests/seguridad/', 'Seguridad', 'B-SEG'],
  ['tests/rendimiento/', 'Rendimiento (presupuestos)', 'B-REN'],
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

const unit = leer('docs/evidencias/unitarias/resultado.json')
const grupos = new Map()
for (const r of unit.testResults) {
  const rel = path.relative(raiz, r.name).replace(/\\/g, '/')
  const tipo = TIPOS.find(([p]) => rel.startsWith(p)) ?? ['', 'Otra', 'B-OTR']
  if (!grupos.has(tipo[1])) grupos.set(tipo[1], { prefijo: tipo[2], archivos: [] })
  grupos.get(tipo[1]).archivos.push({ rel, abs: r.name, pruebas: r.assertionResults })
}

let total = 0
let pasan = 0
let md = `# Catálogo de pruebas — Backend CelularPro

Generado el ${new Date().toISOString().slice(0, 10)} con \`node scripts/catalogo-pruebas.mjs\` a partir
de la evidencia de ejecución. No se edita a mano: si cambian las pruebas, se
vuelve a ejecutar \`npm run test:evidencia\` y este script.

- **Objetivo:** lo que verifica la prueba (su nombre, dentro de su grupo).
- **Resultado esperado:** las aserciones del código de la prueba.
- **Resultado obtenido:** estado y duración en la última ejecución.
- **Evidencia:** \`docs/evidencias/unitarias/resultado.json\` (reporte JSON de Vitest) y
  \`docs/evidencias/rendimiento/\` para la carga.

`
const indice = []
let cuerpo = ''
for (const [tipo, { prefijo, archivos }] of grupos) {
  let n = 0
  const cantidad = archivos.reduce((a, f) => a + f.pruebas.length, 0)
  indice.push(`| ${tipo} | ${archivos.length} | ${cantidad} |`)
  cuerpo += `\n## ${tipo}\n`
  for (const f of archivos.sort((a, b) => a.rel.localeCompare(b.rel))) {
    cuerpo += `\n### \`${f.rel}\`\n\n| ID | Objetivo | Resultado esperado | Obtenido |\n|---|---|---|---|\n`
    for (const t of f.pruebas) {
      n++; total++
      if (t.status === 'passed') pasan++
      const id = `${prefijo}-${String(n).padStart(3, '0')}`
      const objetivo = [...t.ancestorTitles, t.title].join(' › ')
      const obtenido = t.status === 'passed' ? `Pasa (${Math.round(t.duration ?? 0)} ms)` : `**${t.status}**`
      cuerpo += `| ${id} | ${escapar(objetivo)} | ${resumen(aserciones(f.abs, t.title))} | ${obtenido} |\n`
    }
  }
}
md += `## Resumen\n\n| Tipo | Archivos | Pruebas |\n|---|---:|---:|\n${indice.join('\n')}\n| **Total** | | **${total}** (${pasan} pasan) |\n`

const carga = path.join(raiz, 'docs/evidencias/rendimiento/resultados-carga.json')
if (fs.existsSync(carga)) {
  const { entorno, escenarios } = JSON.parse(fs.readFileSync(carga, 'utf8'))
  md += `\n## Carga (autocannon)\n\nEntorno: Node ${entorno.node}, ${entorno.nucleos} núcleo(s), base simulada con ${entorno.latenciaBdSimuladaMs} ms por consulta, bcrypt ${entorno.bcrypt}. Evidencia: \`docs/evidencias/rendimiento/resultados-carga.json\`.\n\n| ID | Objetivo | Condiciones | Resultado esperado | Resultado obtenido |\n|---|---|---|---|---|\n`
  for (const e of escenarios) {
    const esperado = e.criterios.map((c) => c.criterio + (c.informativo ? ' (informativo)' : '')).join('<br>')
    const obtenido = `${e.peticionesTotales} peticiones, ${e.peticionesPorSegundo}/s; p50 ${e.latenciaMs.p50} ms, p97,5 ${e.latenciaMs.p97_5} ms; códigos ${Object.entries(e.codigos).map(([k, v]) => `${k}: ${v}`).join(', ')}<br>${e.criterios.map((c) => `${c.cumple ? 'Cumple' : '**No cumple**'}: ${c.criterio}`).join('<br>')}`
    md += `| B-CAR-${e.id} | ${escapar(e.objetivo)} | \`${e.peticion}\`, ${e.conexiones} conexiones, ${e.duracionS} s | ${esperado} | ${obtenido} |\n`
  }
}

md += cuerpo
fs.mkdirSync(path.join(raiz, 'docs/pruebas'), { recursive: true })
fs.writeFileSync(path.join(raiz, 'docs/pruebas/catalogo-pruebas.md'), md)
console.log(`Catálogo: ${total} pruebas (${pasan} pasan) → docs/pruebas/catalogo-pruebas.md`)
