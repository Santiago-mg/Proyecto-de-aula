import { Router } from 'express'
import {
  alerts,
  ban,
  changeRole,
  stats,
  unban,
  users,
} from '../controllers/admin.controller'
import { asyncHandler } from '../middlewares/async-handler'
import { authenticate, requireAdmin } from '../middlewares/auth.middleware'
import { validate } from '../middlewares/validate.middleware'
import { banUserDto, changeRoleDto } from '../../application/dtos/admin.dto'

const router = Router()

// Todas las rutas de admin requieren autenticación + rol ADMIN
router.use(asyncHandler(authenticate), requireAdmin)

router.get('/stats', asyncHandler(stats))
router.get('/users', asyncHandler(users))
router.get('/alerts', asyncHandler(alerts))
router.put('/users/:id/ban', validate(banUserDto), asyncHandler(ban))
router.put('/users/:id/unban', asyncHandler(unban))
router.put('/users/:id/role', validate(changeRoleDto), asyncHandler(changeRole))

export default router
