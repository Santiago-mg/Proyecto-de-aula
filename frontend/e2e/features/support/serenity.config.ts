import fs from 'node:fs'
import path from 'node:path'
import { After, AfterAll, Before, BeforeAll, setDefaultTimeout } from '@cucumber/cucumber'
import { actorInTheSpotlight, Cast, configure } from '@serenity-js/core'
import { Page } from '@serenity-js/web'
import { BrowseTheWebWithPlaywright } from '@serenity-js/playwright'
import { CallAnApi } from '@serenity-js/rest'
import { Browser, chromium } from 'playwright'

import { API_URL, FRONT_URL, MODO_REAL, PUERTO_API, PUERTO_FRONT } from '../../support/config'
import { detenerApiSimulada, iniciarApiSimulada, resetearApiSimulada } from '../../support/api-simulada'
import { detenerServidorFront, iniciarServidorFront } from '../../support/servidor-front'
import { memoria } from '../../support/memoria'

let browser: Browser

setDefaultTimeout(30_000)

BeforeAll(async () => {
  if (!MODO_REAL) {
    await iniciarApiSimulada(PUERTO_API)
    await iniciarServidorFront(PUERTO_FRONT)
  }

  browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
    // Permite usar un Chromium ya instalado en lugar del que descarga
    // "npx playwright install chromium" (útil en redes restringidas).
    executablePath: process.env.CHROMIUM_PATH || undefined,
  })

  configure({
    actors: Cast.where((actor) =>
      actor.whoCan(
        BrowseTheWebWithPlaywright.using(browser, { baseURL: FRONT_URL }),
        // Barra final obligatoria: las rutas relativas ("auth/login") se
        // resuelven como en un navegador y sin ella se perdería el "/v1".
        CallAnApi.at(API_URL.replace(/\/?$/, '/')),
      ),
    ),
    crew: [
      '@serenity-js/console-reporter',
      ['@serenity-js/html-reporter', { specDirectory: './features' }],
    ],
  })
})

// Cada escenario parte de datos limpios: en modo simulado se resiembra la
// API; en modo real los escenarios crean sus propias cuentas con correos únicos.
Before(() => {
  memoria.limpiar()
  if (!MODO_REAL) resetearApiSimulada()
})

// Evidencia: con E2E_EVIDENCIA=true cada escenario guarda una captura de la
// pantalla final en docs/evidencias/e2e-screenplay/capturas.
const CAPTURAS = path.resolve(__dirname, '../../../docs/evidencias/e2e-screenplay/capturas')
const vistos = new Map<string, number>()

After(async ({ pickle, result }) => {
  if (process.env.E2E_EVIDENCIA !== 'true') return
  try {
    const page = await actorInTheSpotlight().answer(Page.current())
    const imagen = await page.takeScreenshot()
    const nombre = `${path.basename(pickle.uri, '.feature')}--${pickle.name}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w-]+/g, '-')
      .toLowerCase()
    // Los ejemplos de un Esquema del escenario comparten nombre: se numeran.
    const n = (vistos.get(nombre) ?? 0) + 1
    vistos.set(nombre, n)
    fs.mkdirSync(CAPTURAS, { recursive: true })
    fs.writeFileSync(path.join(CAPTURAS, `${nombre}${n > 1 ? `-${n}` : ''}--${result?.status?.toString().toLowerCase()}.png`), Buffer.from(imagen, 'base64'))
  } catch {
    // Escenarios sin navegador abierto (solo API): no hay captura.
  }
})

AfterAll(async () => {
  await browser?.close()
  if (!MODO_REAL) {
    await detenerServidorFront()
    await detenerApiSimulada()
  }
})
