/**
 * Accesibilidad automatizada con axe-core (WCAG 2.1 niveles A y AA).
 *
 * Recorre las pantallas principales con el rol que corresponde y guarda cada
 * violación con su impacto, regla, elementos afectados y captura.
 *
 * Uso: npm run test:accesibilidad [-- antes|despues]
 * La prueba falla si queda alguna violación de impacto "serious" o "critical".
 */
import fs from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { chromium } from 'playwright'
import { MODO_REAL, PUERTO_API, PUERTO_FRONT } from '../support/config'
import { detenerApiSimulada, iniciarApiSimulada } from '../support/api-simulada'
import { detenerServidorFront, iniciarServidorFront } from '../support/servidor-front'
import { contextoConSesion, PANTALLAS } from './sesion'

const ETIQUETA = process.argv[2] ?? 'actual'
const SALIDA = path.resolve(__dirname, '../../docs/evidencias/accesibilidad', ETIQUETA)

async function main() {
  fs.mkdirSync(SALIDA, { recursive: true })
  if (!MODO_REAL) {
    await iniciarApiSimulada(PUERTO_API)
    await iniciarServidorFront(PUERTO_FRONT)
  }
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
  const informe: unknown[] = []
  let graves = 0

  for (const p of PANTALLAS) {
    const ctx = await contextoConSesion(browser, p.rol)
    const page = await ctx.newPage()
    await page.goto(p.ruta)
    await page.waitForSelector(p.espera, { timeout: 10_000 })
    await page.waitForTimeout(600) // animaciones de entrada (framer-motion)
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    const captura = `${p.ruta.replace(/\//g, '_') || '_inicio'}.png`
    await page.screenshot({ path: path.join(SALIDA, captura), fullPage: true })

    const violaciones = r.violations.map((v) => ({
      regla: v.id,
      impacto: v.impact,
      descripcion: v.help,
      wcag: v.tags.filter((t) => /^wcag\d/.test(t)),
      ayuda: v.helpUrl,
      elementos: v.nodes.map((n) => ({ selector: n.target.join(' '), resumen: n.failureSummary?.split('\n').slice(0, 3).join(' ') })),
    }))
    graves += violaciones.filter((v) => v.impacto === 'serious' || v.impacto === 'critical').length
    informe.push({ pantalla: p.nombre, ruta: p.ruta, rol: p.rol, captura, reglasEvaluadas: r.passes.length + r.violations.length, violaciones })
    console.log(`${violaciones.length ? '✗' : '✓'} ${p.nombre} (${p.ruta}): ${violaciones.length} violaciones${violaciones.map((v) => `\n    [${v.impacto}] ${v.regla}: ${v.descripcion} (${v.elementos.length} elementos)`).join('')}`)
    await ctx.close()
  }

  fs.writeFileSync(path.join(SALIDA, 'resultado.json'), JSON.stringify({ fecha: new Date().toISOString(), estandar: 'WCAG 2.1 A/AA (axe-core)', pantallas: informe }, null, 2))
  await browser.close()
  if (!MODO_REAL) {
    await detenerServidorFront()
    await detenerApiSimulada()
  }
  console.log(`\nViolaciones graves o críticas: ${graves}`)
  process.exit(graves ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
