#!/usr/bin/env node
// Doble de la API de ReportPortal para VERIFICAR la integración sin Docker.
//
// No analiza nada: responde lo mínimo que esperan los agentes (ids de launch e
// items) y guarda cada petición para poder revisar qué se envió.
//
//   node reportportal/servidor-simulado.mjs [puerto]        (por defecto 8089)
//   RP_API_KEY=prueba RP_ENDPOINT=http://localhost:8089/api/v1 npm test
//   curl http://localhost:8089/__registro                    (peticiones recibidas)
//
// Para el análisis real (clasificación de fallos, errores similares, ML) se
// necesita el servidor de verdad: reportportal/docker-compose.yml.

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'

const puerto = Number(process.argv[2] || process.env.PUERTO || 8089)
const registro = []

function leerCuerpo(req) {
  return new Promise((resolve) => {
    const partes = []
    req.on('data', (c) => partes.push(c))
    req.on('end', () => resolve(Buffer.concat(partes)))
  })
}

function resumir(req, crudo) {
  const tipo = req.headers['content-type'] || ''
  if (tipo.includes('application/json')) {
    try { return JSON.parse(crudo.toString('utf8')) } catch { return crudo.toString('utf8').slice(0, 500) }
  }
  if (tipo.includes('multipart/form-data')) {
    const texto = crudo.toString('utf8')
    // Para el log se conservan los JSON de cada parte y los nombres de archivo
    const json = [...texto.matchAll(/\r\n\r\n(\{[\s\S]*?\})\r\n--/g)].map((m) => { try { return JSON.parse(m[1]) } catch { return m[1] } })
    const archivos = [...texto.matchAll(/filename="([^"]+)"/g)].map((m) => m[1])
    return { multipart: true, json, archivos, bytes: crudo.length }
  }
  return crudo.length ? `${crudo.length} bytes` : null
}

createServer(async (req, res) => {
  const crudo = await leerCuerpo(req)
  const url = new URL(req.url, `http://localhost:${puerto}`)

  if (url.pathname === '/__registro') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify(registro, null, 2))
  }

  registro.push({
    metodo: req.method,
    ruta: url.pathname,
    autorizacion: req.headers.authorization ? req.headers.authorization.replace(/(Bearer )(.{4}).*/, '$1$2…') : null,
    cuerpo: resumir(req, crudo),
  })

  let respuesta = {}
  if (url.pathname.endsWith('/junit/import')) respuesta = { message: `Launch with id = ${randomUUID()} is successfully imported.` }
  else if (req.method === 'POST') respuesta = { id: randomUUID(), number: registro.length }
  else if (req.method === 'PUT') respuesta = { message: 'ok', id: randomUUID() }
  else if (req.method === 'GET') respuesta = { id: 1, uuid: url.pathname.split('/').pop() }

  res.writeHead(req.method === 'POST' ? 201 : 200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(respuesta))
}).listen(puerto, () => console.log(`ReportPortal simulado escuchando en http://localhost:${puerto}`))
