import { Router } from 'express'
import {
  create,
  detail,
  detailById,
  list,
  remove,
  similar,
  update,
} from '../controllers/phones.controller'
import {
  authenticate,
  requireAdmin,
} from '../middlewares/auth.middleware'
import { asyncHandler } from '../middlewares/async-handler'
import { validate } from '../middlewares/validate.middleware'
import {
  createPhoneDto,
  phonesQueryDto,
  similarQueryDto,
  updatePhoneDto,
} from '../../application/dtos/phone.dto'

const router = Router()

// Públicas — cualquiera puede ver el catálogo
router.get('/', validate(phonesQueryDto, 'query'), asyncHandler(list))
router.get('/:slug', asyncHandler(detail))         // por slug (detalle público)
// Recomendaciones de la ficha del producto. Cuelga del slug porque se pide
// desde la misma pantalla del detalle y con el mismo dato de la URL.
router.get(
  '/:slug/similares',
  validate(similarQueryDto, 'query'),
  asyncHandler(similar),
)

// Admin — solo administradores pueden gestionar el catálogo
// Búsqueda por UUID: alimenta el formulario de edición del panel, así que
// expone el registro crudo (stock, costos). Estaba declarada como pública.
router.get('/id/:id', asyncHandler(authenticate), requireAdmin, asyncHandler(detailById))
router.post('/', asyncHandler(authenticate), requireAdmin, validate(createPhoneDto), asyncHandler(create))
router.put('/:id', asyncHandler(authenticate), requireAdmin, validate(updatePhoneDto), asyncHandler(update))
router.delete('/:id', asyncHandler(authenticate), requireAdmin, asyncHandler(remove))

export default router
