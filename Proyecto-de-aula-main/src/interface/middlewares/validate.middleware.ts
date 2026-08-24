import { NextFunction, Request, Response } from 'express'
import { ZodSchema } from 'zod'

export function validate(schema: ZodSchema, source: 'body' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(
      source === 'body' ? req.body : req.query,
    )

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }))
      res.status(400).json({ error: 'Datos inválidos', errors })
      return
    }

    if (source === 'body') {
      req.body = result.data
    } else {
      req.query = result.data as Record<string, string>
    }

    next()
  }
}
