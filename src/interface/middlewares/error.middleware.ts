import { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../../domain/AppError'

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
