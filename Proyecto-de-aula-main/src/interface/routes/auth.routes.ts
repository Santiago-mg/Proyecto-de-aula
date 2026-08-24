import { Router } from 'express'
import { login, me, register } from '../controllers/auth.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { validate } from '../middlewares/validate.middleware'
import { loginDto, registerDto } from '../../application/dtos/auth.dto'

const router = Router()

router.post('/register', validate(registerDto), register)
router.post('/login', validate(loginDto), login)
router.get('/me', authenticate, me)

export default router
