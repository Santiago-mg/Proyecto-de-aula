import { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../../domain/AppError'

/**
 * Errores 4xx que lanza Express antes de llegar a las rutas: JSON mal formado
 * (400), cuerpo de más de 100 kB (413), un charset que no soporta (415) o una
 * URL con un parámetro mal codificado como "/phones/%E0%A4%A" (400). Son
 * culpa del cliente y ya traen su status. Sin esta rama terminaban como 500
 * y, fuera de producción, la respuesta arrastraba el mensaje interno del
 * parser (DEF-REG-01 y DEF-REG-02, detectados por la suite de tests/regresion).
 *
 * body-parser marca sus errores con `type`; el mensaje se elige por ese tipo y
 * no por el status, porque un 400 puede venir del cuerpo o de la URL.
 */
const MENSAJES_DEL_CLIENTE: Record<string, string> = {
  'entity.parse.failed': 'El cuerpo de la petición no es un JSON válido',
  'entity.too.large': 'El cuerpo de la petición es demasiado grande',
}

function esErrorDelCliente(
  err: Error,
): err is Error & { status: number; type?: string } {
  const { status } = err as { status?: unknown }
  return typeof status === 'number' && status >= 400 && status < 500
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }

  if (esErrorDelCliente(err)) {
    res.status(err.status).json({
      error: MENSAJES_DEL_CLIENTE[err.type ?? ''] ?? 'Petición inválida',
    })
    return
  }

  // Red de seguridad: un ZodError que se escape de validate() es un dato de
  // entrada malo (culpa del cliente), no una falla del servidor. Sin esto
  // termina como 500 y arrastra el esquema completo en la respuesta.
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Datos inválidos',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    })
    return
  }

  // Siempre loggear el error completo en consola para diagnóstico
  console.error('[ERROR 500]', err.message)
  console.error(err.stack)

  // El detalle del error solo se expone fuera de producción. En producción
  // filtraría rutas internas, nombres de tablas y credenciales incrustadas
  // en mensajes de driver; el log de arriba conserva todo para diagnóstico.
  const isProduction = process.env.NODE_ENV === 'production'

  res.status(500).json({
    error: 'Error interno del servidor',
    ...(isProduction ? {} : { detail: err.message }),
  })
}
