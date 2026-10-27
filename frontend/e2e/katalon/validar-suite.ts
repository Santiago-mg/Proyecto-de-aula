/**
 * Ejecuta la suite de Katalon Recorder (HTML) con Playwright.
 *
 * Katalon Recorder es una extensión del navegador y no se puede automatizar
 * en un pipeline. Este intérprete lee el mismo HTML que se abre en Recorder y
 * ejecuta sus comandos, para comprobar que la suite sigue siendo válida
 * cuando cambia el frontend. No reemplaza abrirla en Recorder en clase.
 *
 * Comandos soportados: open, type, click, runScript, storeEval,
 * waitForElementPresent, assertText, assertLocation, assertElementPresent,
 * assertElementNotPresent. Localizadores: id=, css=, xpath=.
 *
 * Uso:  npm run test:katalon            (modo simulado)
 *       E2E_FRONT_URL=... E2E_API_URL=... npm run test:katalon   (modo real)
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium, type Page } from 'playwright'

import { FRONT_URL, MODO_REAL, PUERTO_API, PUERTO_FRONT } from '../support/config'
import { detenerApiSimulada, iniciarApiSimulada } from '../support/api-simulada'
import { detenerServidorFront, iniciarServidorFront } from '../support/servidor-front'

const URL_GRABADA = 'http://localhost:5173'
const ESPERA_MS = 10_000

type Comando = [comando: string, objetivo: string, valor: string]

function decodificar(texto: string): string {
  return texto
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function leerSuite(archivo: string): Array<{ nombre: string; comandos: Comando[] }> {
  const html = fs.readFileSync(archivo, 'utf8')
  return [...html.matchAll(/<table[\s\S]*?<\/table>/g)].map(([tabla]) => {
    const nombre = /colspan="3">([^<]+)</.exec(tabla)![1]
    const comandos = [...tabla.matchAll(/<tr><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><\/tr>/g)].map(
      (m) => [decodificar(m[1]), decodificar(m[2]), decodificar(m[3])] as Comando,
    )
    return { nombre, comandos }
  })
}

/** Patrón de Selenese: "glob:" (por defecto), "regexp:" o "exact:". */
function coincide(patron: string, texto: string): boolean {
  if (patron.startsWith('regexp:')) return new RegExp(patron.slice(7)).test(texto)
  if (patron.startsWith('exact:')) return texto === patron.slice(6)
  const glob = patron.startsWith('glob:') ? patron.slice(5) : patron
  const regex = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[\\s\\S]*').replace(/\?/g, '.')
  return new RegExp(`^${regex}$`).test(texto)
}

function localizador(page: Page, objetivo: string) {
  if (objetivo.startsWith('id=')) return page.locator(`[id="${objetivo.slice(3)}"]`)
  if (objetivo.startsWith('css=')) return page.locator(objetivo.slice(4))
  if (objetivo.startsWith('xpath=')) return page.locator(`xpath=${objetivo.slice(6)}`)
  throw new Error(`Localizador no soportado: ${objetivo}`)
}

async function ejecutar(page: Page, [comando, objetivoCrudo, valorCrudo]: Comando, variables: Map<string, string>) {
  const interpolar = (s: string) => s.replace(/\$\{(\w+)\}/g, (_, v) => variables.get(v) ?? `\${${v}}`)
  const objetivo = interpolar(objetivoCrudo).replace(URL_GRABADA, FRONT_URL.replace(/\/$/, ''))
  const valor = interpolar(valorCrudo)

  switch (comando) {
    case 'open':
      await page.goto(objetivo)
      return
    case 'runScript':
      await page.evaluate(objetivo)
      return
    case 'storeEval':
      variables.set(valor, String(await page.evaluate(objetivo)))
      return
    case 'type':
      await localizador(page, objetivo).first().fill(valor, { timeout: ESPERA_MS })
      return
    case 'click':
      await localizador(page, objetivo).first().click({ timeout: ESPERA_MS })
      return
    case 'waitForElementPresent':
      await localizador(page, objetivo).first().waitFor({ state: 'attached', timeout: ESPERA_MS })
      return
    case 'assertText': {
      const texto = (await localizador(page, objetivo).first().innerText({ timeout: ESPERA_MS })).trim()
      if (!coincide(valor, texto)) throw new Error(`assertText: "${texto}" no coincide con "${valor}"`)
      return
    }
    case 'assertLocation':
      if (!coincide(objetivo, page.url())) throw new Error(`assertLocation: ${page.url()} no coincide con ${objetivo}`)
      return
    case 'assertElementPresent':
      if ((await localizador(page, objetivo).count()) === 0) throw new Error(`No existe ${objetivo}`)
      return
    case 'assertElementNotPresent':
      if ((await localizador(page, objetivo).count()) > 0) throw new Error(`Existe ${objetivo} y no debería`)
      return
    default:
      throw new Error(`Comando no soportado por el intérprete: ${comando}`)
  }
}

async function main() {
  const archivo = path.join(__dirname, process.argv[2] ?? 'Suite_CelularPro_6_funcionalidades.html')
  const casos = leerSuite(archivo)

  if (!MODO_REAL) {
    await iniciarApiSimulada(PUERTO_API)
    await iniciarServidorFront(PUERTO_FRONT)
  }
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
  let fallidos = 0
  const EVIDENCIA = path.resolve(__dirname, '../../docs/evidencias/katalon')
  fs.mkdirSync(EVIDENCIA, { recursive: true })
  const registro: unknown[] = []

  for (const caso of casos) {
    // Igual que Recorder: un mismo navegador para toda la suite; cada caso
    // limpia la sesión con sus propios comandos.
    const contexto = await browser.newContext()
    const page = await contexto.newPage()
    const variables = new Map<string, string>()
    const inicio = Date.now()
    const pasos: Array<{ paso: number; comando: string; resultado: string }> = []
    let error: string | undefined
    try {
      for (const [i, comando] of caso.comandos.entries()) {
        try {
          await ejecutar(page, comando, variables)
          pasos.push({ paso: i + 1, comando: comando.filter(Boolean).join(' | '), resultado: 'OK' })
        } catch (e) {
          const mensaje = (e as Error).message.split('\n')[0]
          pasos.push({ paso: i + 1, comando: comando.filter(Boolean).join(' | '), resultado: `FALLA: ${mensaje}` })
          throw new Error(`paso ${i + 1} (${comando.join(' | ')}): ${mensaje}`)
        }
      }
      console.log(`✓ ${caso.nombre} (${caso.comandos.length} comandos, ${Date.now() - inicio} ms)`)
    } catch (e) {
      fallidos++
      error = (e as Error).message
      console.log(`✗ ${caso.nombre}\n    ${error}`)
    }
    const captura = `${caso.nombre}.png`
    await page.screenshot({ path: path.join(EVIDENCIA, captura), fullPage: true }).catch(() => undefined)
    registro.push({ caso: caso.nombre, resultado: error ? 'FALLA' : 'PASA', duracionMs: Date.now() - inicio, error, captura, pasos })
    await contexto.close()
  }

  fs.writeFileSync(
    path.join(EVIDENCIA, 'resultado.json'),
    JSON.stringify({ fecha: new Date().toISOString(), suite: path.basename(archivo), entorno: MODO_REAL ? FRONT_URL : 'simulado', casos: registro }, null, 2),
  )
  await browser.close()
  if (!MODO_REAL) {
    await detenerServidorFront()
    await detenerApiSimulada()
  }
  console.log(`\n${casos.length - fallidos} de ${casos.length} casos correctos`)
  process.exit(fallidos ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
