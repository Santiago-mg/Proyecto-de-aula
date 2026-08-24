import { NextFunction, Request, Response } from 'express'
import { UserRepository } from '../../infrastructure/repositories/UserRepository'
import {
  loginUser,
  registerUser,
} from '../../application/use-cases/auth.use-cases'

const repo = new UserRepository()

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await registerUser(repo, req.body)
    res.status(201).json({ data: result })
  } catch (error) {
    next(error)
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await loginUser(repo, req.body)
    res.json({ data: result })
  } catch (error) {
    next(error)
  }
}

export function me(req: Request, res: Response) {
  res.json({ data: req.user })
}
