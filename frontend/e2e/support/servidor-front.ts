import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

/**
 * Sirve el frontend compilado (e2e/.front-dist) con "fallback" a index.html,
 * igual que Vercel o Netlify con una SPA: /admin/users devuelve index.html y
 * React Router resuelve la ruta en el navegador.
 */

const DIST = path.resolve(__dirname, '..', '.front-dist')

const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
}

let servidor: http.Server | undefined

export function iniciarServidorFront(puerto: number): Promise<void> {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    throw new Error(
      `No existe ${DIST}/index.html. Ejecute "npm test" (compila el frontend) o "npm run build:front".`,
    )
  }

  servidor = http.createServer((req, res) => {
    const ruta = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
    let archivo = path.join(DIST, ruta)
    if (!archivo.startsWith(DIST) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) {
      archivo = path.join(DIST, 'index.html')
    }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] ?? 'application/octet-stream' })
    fs.createReadStream(archivo).pipe(res)
  })

  return new Promise((resolve) => servidor!.listen(puerto, resolve))
}

export function detenerServidorFront(): Promise<void> {
  return new Promise((resolve) => (servidor ? servidor.close(() => resolve()) : resolve()))
}
