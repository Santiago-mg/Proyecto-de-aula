import prisma from '../../src/infrastructure/database/prisma'

/**
 * Borra todo el contenido de la base de datos de pruebas.
 *
 * El orden importa: hay que borrar primero lo que depende de una llave
 * foránea y al final lo que no depende de nada. Si se borrara User antes
 * que Order, por ejemplo, Postgres rechazaría el borrado porque todavía
 * hay pedidos apuntando a ese usuario.
 *
 *   OrderItem → Order → (PhoneImage, PhoneColor, PhoneFeature) → Phone → Category → User
 *
 * Se llama en el beforeEach de cada archivo de prueba, así que ninguna
 * prueba arranca con datos que dejó la anterior.
 */
export async function limpiarBaseDeDatos(): Promise<void> {
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.phoneImage.deleteMany()
  await prisma.phoneColor.deleteMany()
  await prisma.phoneFeature.deleteMany()
  await prisma.phone.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()
}
