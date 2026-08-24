import { NextFunction, Request, Response } from 'express'
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

  // Siempre loggear el error completo en consola para diagnóstico
  console.error('[ERROR 500]', err.message)
  console.error(err.stack)

  res.status(500).json({
    error: 'Error interno del servidor',
    detail: err.message, // temporal para diagnóstico
  })
}
