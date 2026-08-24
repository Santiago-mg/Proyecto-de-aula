import { NextFunction, Request, Response } from 'express'
import { OrderRepository } from '../../infrastructure/repositories/OrderRepository'
import {
  createOrder,
  getAllOrders,
  getMyOrders,
  updateOrderStatus,
} from '../../application/use-cases/orders.use-cases'
import type { OrderStatus } from '../../domain/entities/Order'

const repo = new OrderRepository()

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await createOrder(repo, req.body, req.user?.id)
    res.status(201).json({ data: order })
  } catch (error) {
    next(error)
  }
}

export async function myOrders(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const orders = await getMyOrders(repo, req.user!.id)
    res.json({ data: orders })
  } catch (error) {
    next(error)
  }
}

export async function all(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const result = await getAllOrders(repo, page, limit)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export async function updateStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const order = await updateOrderStatus(
      repo,
      req.params.id,
      req.body.status as OrderStatus,
    )
    res.json({ data: order })
  } catch (error) {
    next(error)
  }
}
