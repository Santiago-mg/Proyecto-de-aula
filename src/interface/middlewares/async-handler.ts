import type { NextFunction, Request, RequestHandler, Response } from 'express'

type ManejadorAsync = (req: Request, res: Response, next: NextFunction) => Promise<unknown>

/**
 * Express 4 no sabe de promesas: si recibe una función async, ignora la promesa
 * que devuelve. Este adaptador la convierte en un manejador normal y, si la
 * promesa se rechaza, le pasa el error al errorHandler con next().
 *
 * Los controladores ya capturan sus propios errores; esto es la red de
 * seguridad, y es lo que pide SonarQube con la regla S6544.
 */
export function asyncHandler(fn: ManejadorAsync): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}
