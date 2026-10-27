/**
 * Pruebas de interfaz: comportamiento visual y de interacción que las pruebas
 * unitarias no ven.
 *
 *   I1  Diseño adaptable: en 1366×768 y 375×812 ninguna pantalla se desborda
 *       horizontalmente (no aparece barra de desplazamiento lateral).
 *   I2  Teclado: el formulario de ingreso se recorre con Tab en orden lógico,
 *       el foco es visible y Enter envía.
 *   I3  Estados de error: el formulario vacío muestra los errores junto a cada
 *       campo y no navega.
 *   I4  Retroalimentación: guardar el perfil muestra una confirmación visible.
 *
 * Guarda capturas y docs/evidencias/interfaz/resultado.json.
 * Uso: npm run test:interfaz
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium, type Page } from 'playwright'
import { MODO_REAL, PUERTO_API, PUERTO_FRONT } from '../support/config'
import { detenerApiSimulada, iniciarApiSimulada } from '../support/api-simulada'
import { detenerServidorFront, iniciarServidorFront } from '../support/servidor-front'
import { contextoConSesion, PANTALLAS } from './sesion'

const SALIDA = path.resolve(__dirname, '../../docs/evidencias/interfaz')
const VISTAS = { escritorio: { width: 1366, height: 768 }, movil: { width: 375, height: 812 } }

interface Caso {
  id: string
  objetivo: string
  esperado: string
  obtenido: string
  ok: boolean
  evidencia: string[]
}
const casos: Caso[] = []

/** Píxeles que el usuario puede desplazar la página hacia la derecha. */
async function desborde(page: Page): Promise<number> {
  return page.evaluate(() => {
    window.scrollTo(10_000, window.scrollY)
    const x = window.scrollX
    window.scrollTo(0, window.scrollY)
    return x
  })
}

/**
 * Controles (enlaces, botones, campos) que quedan cortados fuera de la
 * pantalla. No cuentan los que están dentro de un contenedor con su propio
 * desplazamiento (una tabla ancha) ni los de paneles cerrados fuera de
 * pantalla (carrito, menú lateral).
 */
function controlesCortados(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const cortados: string[] = []
    for (const el of Array.from(document.querySelectorAll('a, button, input, select, textarea')) as HTMLElement[]) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.right <= vw + 1) continue
      let excluido = false
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const s = getComputedStyle(a)
        const ra = a.getBoundingClientRect()
        if (s.overflowX !== 'visible' && ra.right <= vw + 1) excluido = true
        if (s.position === 'fixed' && ra.left >= vw - 1) excluido = true
        if (excluido) break
      }
      if (!excluido) cortados.push((el.textContent?.trim() || el.id || el.tagName).slice(0, 30))
    }
    return cortados
  })
}

async function main() {
  fs.mkdirSync(SALIDA, { recursive: true })
  if (!MODO_REAL) {
    await iniciarApiSimulada(PUERTO_API)
    await iniciarServidorFront(PUERTO_FRONT)
  }
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })

  // I1 — diseño adaptable
  for (const [vista, viewport] of Object.entries(VISTAS)) {
    const fallos: string[] = []
    const capturas: string[] = []
    for (const p of PANTALLAS) {
      const ctx = await contextoConSesion(browser, p.rol, { viewport })
      const page = await ctx.newPage()
      await page.goto(p.ruta)
      await page.waitForSelector(p.espera, { timeout: 10_000 })
      await page.waitForTimeout(500)
      const px = await desborde(page)
      const cortados = await controlesCortados(page)
      if (px > 1) fallos.push(`${p.ruta} se desplaza ${px}px`)
      if (cortados.length) fallos.push(`${p.ruta} corta: ${cortados.join(', ')}`)
      const archivo = `I1-${vista}${p.ruta.replace(/\//g, '_') || '_inicio'}.png`
      await page.screenshot({ path: path.join(SALIDA, archivo) })
      capturas.push(archivo)
      await ctx.close()
    }
    casos.push({
      id: `I1-${vista}`,
      objetivo: `Comprobar que las ${PANTALLAS.length} pantallas se adaptan a ${viewport.width}×${viewport.height}.`,
      esperado: 'Ninguna pantalla se desplaza horizontalmente ni deja controles cortados fuera de la vista.',
      obtenido: fallos.length ? fallos.join('; ') : 'Ninguna se desplaza ni corta controles.',
      ok: fallos.length === 0,
      evidencia: capturas,
    })
  }

  // I2 — teclado
  {
    const ctx = await contextoConSesion(browser, 'anonimo')
    const page = await ctx.newPage()
    await page.goto('/login')
    await page.waitForSelector('#email')
    await page.focus('#email')
    const orden: string[] = []
    let focoVisible = true
    for (let i = 0; i < 3; i++) {
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement
        const estilo = getComputedStyle(el)
        return { id: el.id || el.textContent?.trim() || el.tagName, outline: estilo.outlineStyle !== 'none' || estilo.boxShadow !== 'none' }
      })
      orden.push(info.id)
      focoVisible &&= info.outline
      if (i < 2) await page.keyboard.press('Tab')
    }
    await page.screenshot({ path: path.join(SALIDA, 'I2-foco-boton.png') })
    await page.focus('#email')
    await page.keyboard.type('admin@celularpro.co')
    await page.keyboard.press('Tab')
    await page.keyboard.type('admin1234')
    await page.keyboard.press('Enter')
    const navego = await page.waitForURL('**/dashboard', { timeout: 8000 }).then(() => true).catch(() => false)
    casos.push({
      id: 'I2',
      objetivo: 'Comprobar que se puede iniciar sesión solo con el teclado.',
      esperado: 'Orden de foco Email → Contraseña → Ingresar, foco visible en cada paso y Enter envía el formulario.',
      obtenido: `Orden: ${orden.join(' → ')}; foco visible: ${focoVisible ? 'sí' : 'no'}; Enter navegó a /dashboard: ${navego ? 'sí' : 'no'}.`,
      ok: orden[0] === 'email' && orden[1] === 'password' && /ingresar/i.test(orden[2]) && focoVisible && navego,
      evidencia: ['I2-foco-boton.png'],
    })
    await ctx.close()
  }

  // I3 — estados de error
  {
    const ctx = await contextoConSesion(browser, 'anonimo')
    const page = await ctx.newPage()
    await page.goto('/register')
    await page.waitForSelector('#name')
    await page.click('form button[type="submit"]')
    await page.waitForSelector('.cp-field-error')
    const errores = await page.$$eval('.cp-field-error', (els) => els.map((e) => e.textContent?.trim()))
    const invalidos = await page.$$eval('[aria-invalid="true"]', (els) => els.map((e) => e.id))
    await page.screenshot({ path: path.join(SALIDA, 'I3-registro-errores.png') })
    casos.push({
      id: 'I3',
      objetivo: 'Comprobar que enviar el registro vacío muestra un error junto a cada campo obligatorio.',
      esperado: 'Cuatro mensajes de error, los cuatro campos marcados aria-invalid y la página sigue en /register.',
      obtenido: `${errores.length} mensajes (${errores.join(' | ')}); campos inválidos: ${invalidos.join(', ')}; ruta: ${new URL(page.url()).pathname}.`,
      ok: errores.length === 4 && invalidos.length === 4 && page.url().endsWith('/register'),
      evidencia: ['I3-registro-errores.png'],
    })
    await ctx.close()
  }

  // I4 — retroalimentación al guardar
  {
    const ctx = await contextoConSesion(browser, 'cliente')
    const page = await ctx.newPage()
    await page.goto('/profile')
    await page.waitForSelector('#profile-name')
    await page.fill('#profile-name', 'Valentina Rojas')
    await page.click('text=Guardar nombre')
    const toast = await page.waitForSelector('text=Nombre actualizado', { timeout: 5000 }).then(() => true).catch(() => false)
    await page.screenshot({ path: path.join(SALIDA, 'I4-perfil-confirmacion.png') })
    const menu = await page.textContent('header a[href="/dashboard"]')
    casos.push({
      id: 'I4',
      objetivo: 'Comprobar que guardar el perfil da retroalimentación inmediata.',
      esperado: 'Aparece "Nombre actualizado" y el menú muestra el nombre nuevo sin recargar.',
      obtenido: `Confirmación visible: ${toast ? 'sí' : 'no'}; menú: "${menu?.trim()}".`,
      ok: toast && menu?.trim() === 'Valentina',
      evidencia: ['I4-perfil-confirmacion.png'],
    })
    await ctx.close()
  }

  await browser.close()
  if (!MODO_REAL) {
    await detenerServidorFront()
    await detenerApiSimulada()
  }
  fs.writeFileSync(path.join(SALIDA, 'resultado.json'), JSON.stringify({ fecha: new Date().toISOString(), casos }, null, 2))
  for (const c of casos) console.log(`${c.ok ? '✓' : '✗'} ${c.id}: ${c.obtenido}`)
  process.exit(casos.every((c) => c.ok) ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
