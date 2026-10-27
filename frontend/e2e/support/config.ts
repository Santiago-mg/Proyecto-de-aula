/**
 * Dos modos de ejecución:
 *
 *   Simulado (por defecto)  Levanta una API en memoria con las mismas reglas
 *                           que el backend y sirve el frontend compilado. No
 *                           necesita Postgres: corre igual en cualquier equipo
 *                           y en el pipeline.
 *
 *   Real                    E2E_FRONT_URL y E2E_API_URL apuntan al frontend y
 *                           al backend reales (con la base sembrada con
 *                           npm run db:seed). No se levanta nada.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const puertos = require('../scripts/puertos') as {
  PUERTO_API: number
  PUERTO_FRONT: number
  API_URL_SIMULADA: string
  FRONT_URL_SIMULADO: string
}

export const MODO_REAL = Boolean(process.env.E2E_FRONT_URL)

export const FRONT_URL = process.env.E2E_FRONT_URL ?? puertos.FRONT_URL_SIMULADO
export const API_URL = process.env.E2E_API_URL ?? puertos.API_URL_SIMULADA

export const PUERTO_API = puertos.PUERTO_API
export const PUERTO_FRONT = puertos.PUERTO_FRONT

/** Cuenta creada por el seed del backend (y por la API simulada). */
export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? 'admin@celularpro.co',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'admin1234',
}

/** Celular del seed que usan los escenarios de alertas de stock. */
export const SLUG_CELULAR_ALERTAS = process.env.E2E_SLUG_CELULAR ?? 'iphone-13-usado'
