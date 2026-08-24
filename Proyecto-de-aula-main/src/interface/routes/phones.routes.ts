import { Router } from 'express'
import {
  create,
  detail,
  detailById,
  list,
  remove,
  update,
} from '../controllers/phones.controller'
import {
  authenticate,
  requireAdmin,
} from '../middlewares/auth.middleware'
import { validate } from '../middlewares/validate.middleware'
import {
  createPhoneDto,
  updatePhoneDto,
} from '../../application/dtos/phone.dto'

const router = Router()

// Públicas — cualquiera puede ver el catálogo
router.get('/', list)
router.get('/id/:id', detailById)   // por UUID (admin edit)
router.get('/:slug', detail)         // por slug (detalle público)

// Admin — solo administradores pueden gestionar el catálogo
router.post('/', authenticate, requireAdmin, validate(createPhoneDto), create)
router.put('/:id', authenticate, requireAdmin, validate(updatePhoneDto), update)
router.delete('/:id', authenticate, requireAdmin, remove)

export default router
