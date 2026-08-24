import { Router } from 'express'
import adminRoutes from './admin.routes'
import authRoutes from './auth.routes'
import ordersRoutes from './orders.routes'
import phonesRoutes from './phones.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/phones', phonesRoutes)
router.use('/orders', ordersRoutes)
router.use('/admin', adminRoutes)

export default router
