import { afterAll } from 'vitest'

/**
 * Red de seguridad antes de correr una sola prueba.
 *
 * Esta suite ya no simula la base de datos: usa una Postgres real y cada
 * prueba borra y vuelve a llenar las tablas (ver helpers/db.ts). Si por
 * error DATABASE_URL apuntara a la base compartida del equipo en vez de a
 * una base de pruebas dedicada, ese borrado se llevaría por delante los
 * datos de todos los demás. Por eso, si la URL no contiene la palabra
 * "test", se corta la ejecución antes de tocar nada.
 */
const databaseUrl = process.env.DATABASE_URL ?? ''

if (!databaseUrl.includes('test')) {
  throw new Error(
    '\n\n' +
      '   DATABASE_URL no parece apuntar a una base de datos de pruebas.\n' +
      '   Esta suite borra todas las tablas antes de cada prueba, así que\n' +
      '   nunca debe correr contra la base compartida del equipo.\n\n' +
      '   Crea un archivo .env.test (mirando .env.test.example) con una\n' +
      '   base propia, por ejemplo:\n\n' +
      '   DATABASE_URL="postgresql://usuario:password@127.0.0.1:5432/celularpro_test"\n\n',
  )
}

// Cierra la conexión de Prisma al terminar cada archivo de prueba. Con
// isolate:true cada archivo carga su propio cliente Prisma (su propia
// conexión), así que sin este cierre se podrían acumular conexiones
// abiertas a medida que corren los 17 archivos.
afterAll(async () => {
  const prisma = (await import('../src/infrastructure/database/prisma')).default
  await prisma.$disconnect()
})
