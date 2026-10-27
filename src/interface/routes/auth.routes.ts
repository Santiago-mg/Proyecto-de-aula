import { Router } from 'express'
import {
  changeMyPassword,
  login,
  me,
  register,
  updateMe,
} from '../controllers/auth.controller'
import { asyncHandler } from '../middlewares/async-handler'
import { authenticate } from '../middlewares/auth.middleware'
import { validate } from '../middlewares/validate.middleware'
import { limitarIntentosLogin } from '../middlewares/login-limiter.middleware'
import {
  changePasswordDto,
  loginDto,
  registerDto,
  updateProfileDto,
} from '../../application/dtos/auth.dto'

const router = Router()

// Registro de usuario e inicio de sesión
router.post('/register', validate(registerDto), asyncHandler(register))
router.post('/login', validate(loginDto), limitarIntentosLogin, asyncHandler(login))

// Gestión de perfil (siempre sobre la cuenta del token, nunca por id)
router.get('/me', asyncHandler(authenticate), asyncHandler(me))
router.patch('/me', asyncHandler(authenticate), validate(updateProfileDto), asyncHandler(updateMe))
router.put(
  '/me/password',
  asyncHandler(authenticate),
  validate(changePasswordDto),
  asyncHandler(changeMyPassword),
)

export default router
