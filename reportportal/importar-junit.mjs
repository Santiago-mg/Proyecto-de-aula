#!/usr/bin/env node
// Importa a ReportPortal un reporte JUnit (XML o ZIP) como un launch.
//
// Se usa para las suites que no tienen agente compatible:
//   - Momentic           (npx momentic run --reporter junit)
//   - Serenity/Cucumber  (Cucumber 13 no lo soporta el agente oficial, que llega a 12.x)
//   - Katalon            (e2e/katalon/a-junit.cjs convierte resultados.json a JUnit)
//
// API: POST {servidor}/api/v1/plugin/{proyecto}/junit/import  (multipart: file + launchImportRq)
// Uso:  node reportportal/importar-junit.mjs <archivo.xml|zip> <suite> ["descripción"]

import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const rp = require('./config.cjs')

const [archivo, suite, descripcion = ''] = process.argv.slice(2)

if (!archivo || !suite) {
  console.error('Uso: node reportportal/importar-junit.mjs <archivo.xml|zip> <suite> ["descripción"]')
  process.exit(2)
}
if (!rp.activo()) {
  console.log('RP_API_KEY no está definida: no se importa nada (ReportPortal desactivado).')
  process.exit(0)
}

const o = rp.opciones(suite, descripcion || `Importado desde ${basename(archivo)}`)
// La importación vive en la API v1 aunque el agente use /api/v2
const servidor = o.endpoint.replace(/\/api\/v[12]$/, '')
const url = `${servidor}/api/v1/plugin/${encodeURIComponent(o.project)}/junit/import`

const contenido = await readFile(archivo)
const tipo = archivo.endsWith('.zip') ? 'application/zip' : 'application/xml'
const form = new FormData()
form.append('file', new Blob([contenido], { type: tipo }), basename(archivo))
form.append(
  'launchImportRq',
  new Blob([JSON.stringify({ name: o.launch, description: o.description, attributes: o.attributes })], {
    type: 'application/json',
  }),
)

const respuesta = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${o.apiKey}` }, body: form })
const texto = await respuesta.text()
if (!respuesta.ok) {
  console.error(`ReportPortal respondió ${respuesta.status}: ${texto}`)
  process.exit(1)
}
console.log(`Launch "${o.launch}" importado en el proyecto ${o.project}: ${texto}`)
