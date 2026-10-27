import { Router } from 'express'
import { all, create, myOrders, updateStatus } from '../controllers/orders.controller'
import {
  authenticate,
  requireAdmin,
} from '../middlewares/auth.middleware'
import { validate } from '../middlewares/validate.middleware'
import {
  createOrderDto,
  updateOrderStatusDto,
} from '../../application/dtos/order.dto'

const router = Router()

// Usuario autenticado
router.post('/', authenticate, validate(createOrderDto), create)
router.get('/my', authenticate, myOrders)

// Admin
router.get('/', authenticate, requireAdmin, all)
router.put('/:id/status', authenticate, requireAdmin, validate(updateOrderStatusDto), updateStatus)

export default router
