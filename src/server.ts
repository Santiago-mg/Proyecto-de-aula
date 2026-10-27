import 'dotenv/config'
import app from './app'
import prisma from './infrastructure/database/prisma'

const PORT = process.env.PORT || 3001

async function main() {
  await prisma.$connect()
  app.listen(PORT, () => {
    console.log(`CelularPro API → http://localhost:${PORT}`)
    console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`)
  })
}

main().catch((err) => {
  console.error('Error al iniciar el servidor:', err)
  process.exit(1)
})
