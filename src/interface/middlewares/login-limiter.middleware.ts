import { NextFunction, Request, Response } from 'express'
import { normalizarEmail } from '../../domain/credenciales'

/**
 * Limita los intentos FALLIDOS de inicio de sesión (fuerza bruta).
 *
 * Dos contadores en memoria, por ventana de tiempo:
 *   - por IP + correo: frena a quien prueba contraseñas sobre una cuenta.
 *   - por IP: frena a quien prueba una contraseña común sobre muchas cuentas.
 *
 * Solo cuentan las respuestas 401. Un login correcto borra el contador de esa
 * cuenta, así que un usuario que se equivoca un par de veces no queda
 * bloqueado. Al superar el límite responde 429 con Retry-After.
 *
 * Es memoria del proceso: con varias instancias (serverless, réplicas) cada
 * una lleva su cuenta. Para eso se recomienda un almacén compartido (Redis);
 * ver docs/pruebas/seguridad-rendimiento.md.
 */

const VENTANA_MS = Number(process.env.LOGIN_VENTANA_MS ?? 15 * 60 * 1000)
const MAX_POR_CUENTA = Number(process.env.LOGIN_MAX_INTENTOS ?? 5)
const MAX_POR_IP = Number(process.env.LOGIN_MAX_INTENTOS_IP ?? 50)

interface Contador {
  fallos: number
  desde: number
}

const contadores = new Map<string, Contador>()

function vigente(clave: string, ahora: number): Contador | undefined {
  const c = contadores.get(clave)
  if (c && ahora - c.desde >= VENTANA_MS) {
    contadores.delete(clave)
    return undefined
  }
  return c
}

function sumarFallo(clave: string, ahora: number) {
  const c = vigente(clave, ahora)
  if (c) c.fallos++
  else contadores.set(clave, { fallos: 1, desde: ahora })
}

/** Solo para pruebas: deja el limitador vacío. */
export function reiniciarLimitadorLogin(): void {
  contadores.clear()
}

export function limitarIntentosLogin(req: Request, res: Response, next: NextFunction) {
  const ahora = Date.now()
  const ip = req.ip ?? 'desconocida'
  const email = typeof req.body?.email === 'string' ? normalizarEmail(req.body.email) : ''
  const claveCuenta = `cuenta:${ip}:${email}`
  const claveIp = `ip:${ip}`

  const bloqueo = [
    [vigente(claveCuenta, ahora), MAX_POR_CUENTA],
    [vigente(claveIp, ahora), MAX_POR_IP],
  ].find(([c, max]) => c && (c as Contador).fallos >= (max as number)) as [Contador, number] | undefined

  if (bloqueo) {
    const restanteMs = VENTANA_MS - (ahora - bloqueo[0].desde)
    const minutos = Math.max(1, Math.ceil(restanteMs / 60_000))
    res.setHeader('Retry-After', String(Math.ceil(restanteMs / 1000)))
    res.status(429).json({
      error: `Demasiados intentos fallidos. Intenta de nuevo en ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}.`,
    })
    return
  }

  res.on('finish', () => {
    if (res.statusCode === 401) {
      sumarFallo(claveCuenta, Date.now())
      sumarFallo(claveIp, Date.now())
    } else if (res.statusCode === 200) {
      contadores.delete(claveCuenta)
    }
  })
  next()
}
