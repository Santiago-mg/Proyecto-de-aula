import { Router } from 'express'
import {
  changeMyPassword,
  login,
  me,
  register,
  updateMe,
} from '../controllers/auth.controller'
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
router.post('/register', validate(registerDto), register)
router.post('/login', validate(loginDto), limitarIntentosLogin, login)

// Gestión de perfil (siempre sobre la cuenta del token, nunca por id)
router.get('/me', authenticate, me)
router.patch('/me', authenticate, validate(updateProfileDto), updateMe)
router.put(
  '/me/password',
  authenticate,
  validate(changePasswordDto),
  changeMyPassword,
)

export default router
