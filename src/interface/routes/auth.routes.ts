import { Router } from 'express'
import { login, me, register } from '../controllers/auth.controller'
import { asyncHandler } from '../middlewares/async-handler'
import { authenticate } from '../middlewares/auth.middleware'
import { validate } from '../middlewares/validate.middleware'
import { loginDto, registerDto } from '../../application/dtos/auth.dto'

const router = Router()

router.post('/register', validate(registerDto), asyncHandler(register))
router.post('/login', validate(loginDto), asyncHandler(login))
router.get('/me', asyncHandler(authenticate), asyncHandler(me))

export default router
