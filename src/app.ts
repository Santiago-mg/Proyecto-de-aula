import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { errorHandler } from './interface/middlewares/error.middleware'
import routes from './interface/routes'

const app = express()

// Oculta la cabecera "X-Powered-By: Express": deja de anunciar el framework
// y su versión a cualquiera que mire las respuestas.
app.disable('x-powered-by')

// Detrás de un proxy (Vercel, Nginx) req.ip sería la IP del proxy y el
// limitador de intentos bloquearía a todos los usuarios a la vez. Solo se
// activa si se declara: confiar en X-Forwarded-For sin proxy permitiría
// falsificar la IP.
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1)

// Cabeceras de seguridad estándar (helmet): nosniff, X-Frame-Options, HSTS,
// Referrer-Policy, CSP mínima para una API, etc. Pendiente del criterio 2:
// antes solo se quitaba X-Powered-By.
app.use(helmet())

// CORS. Con FRONTEND_URL se permite solo ese origen (y credenciales). Sin ella
// se acepta cualquier origen pero SIN credenciales: '*' con credenciales es una
// combinación que los navegadores rechazan, y el frontend no la necesita porque
// envía el token en la cabecera Authorization, no en cookies.
const origenPermitido = process.env.FRONTEND_URL
app.use(
  cors({
    origin: origenPermitido || '*',
    credentials: Boolean(origenPermitido),
  }),
)
app.use(express.json())

// Las respuestas de la API llevan datos de la cuenta y tokens: ningún navegador
// ni proxy intermedio debe guardarlas en caché.
app.use('/api/v1', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
})

// Verificación rápida de que el servidor está activo
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/v1', routes)

// 404 — ruta no encontrada
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' })
})

// Manejador global de errores (siempre al final)
app.use(errorHandler)

export default app
