import { NextFunction, Request, Response } from 'express'
import { PhoneRepository } from '../../infrastructure/repositories/PhoneRepository'
import {
  createPhone,
  deletePhone,
  getPhoneById,
  getPhoneBySlug,
  getPhones,
  updatePhone,
} from '../../application/use-cases/phones.use-cases'
import type { PhonesQueryDto } from '../../application/dtos/phone.dto'

const repo = new PhoneRepository()

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    // Ya viene validado y convertido por validate(phonesQueryDto, 'query').
    // Antes se hacía .parse() aquí, y el ZodError crudo llegaba al manejador
    // global como 500 en lugar de responder 400.
    const result = await getPhones(repo, req.query as unknown as PhonesQueryDto)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export async function detail(req: Request, res: Response, next: NextFunction) {
  try {
    const phone = await getPhoneBySlug(repo, req.params.slug)
    res.json({ data: phone })
  } catch (error) {
    next(error)
  }
}

export async function detailById(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const phone = await getPhoneById(repo, req.params.id)
    res.json({ data: phone })
  } catch (error) {
    next(error)
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const phone = await createPhone(repo, req.body)
    res.status(201).json({ data: phone })
  } catch (error) {
    next(error)
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const phone = await updatePhone(repo, req.params.id, req.body)
    res.json({ data: phone })
  } catch (error) {
    next(error)
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await deletePhone(repo, req.params.id)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
