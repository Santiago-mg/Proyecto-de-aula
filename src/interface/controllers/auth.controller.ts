import { NextFunction, Request, Response } from 'express'
import { UserRepository } from '../../infrastructure/repositories/UserRepository'
import {
  changePassword,
  getProfile,
  loginUser,
  registerUser,
  updateProfile,
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

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getProfile(repo, req.user!.id)
    res.json({ data: user })
  } catch (error) {
    next(error)
  }
}

export async function updateMe(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await updateProfile(repo, req.user!.id, req.body)
    res.json({ data: user })
  } catch (error) {
    next(error)
  }
}

export async function changeMyPassword(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await changePassword(repo, req.user!.id, req.body)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
}
