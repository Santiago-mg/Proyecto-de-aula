import { Router } from 'express'
import { all, create, myOrders, updateStatus } from '../controllers/orders.controller'
import {
  authenticate,
  requireAdmin,
} from '../middlewares/auth.middleware'
import { asyncHandler } from '../middlewares/async-handler'
import { validate } from '../middlewares/validate.middleware'
import {
  createOrderDto,
  updateOrderStatusDto,
} from '../../application/dtos/order.dto'

const router = Router()

// Usuario autenticado
router.post('/', asyncHandler(authenticate), validate(createOrderDto), asyncHandler(create))
router.get('/my', asyncHandler(authenticate), asyncHandler(myOrders))

// Admin
router.get('/', asyncHandler(authenticate), requireAdmin, asyncHandler(all))
router.put('/:id/status', asyncHandler(authenticate), requireAdmin, validate(updateOrderStatusDto), asyncHandler(updateStatus))

export default router
