import { vi } from 'vitest'

/**
 * Intercepta el cliente Prisma antes de que cualquier repositorio lo importe.
 *
 * La fábrica es asíncrona a propósito: el import ocurre cuando el módulo se
 * pide de verdad, así que no hay problemas de orden con el hoisting de vi.mock.
 */
vi.mock('../src/infrastructure/database/prisma', async () => {
  const { prismaMock } = await import('./helpers/prisma-mock')
  return { default: prismaMock }
})

/**
 * bcrypt es un módulo nativo: se compila para el sistema operativo donde se
 * instaló, así que la suite no correría en otra máquina ni en un pipeline de
 * integración continua. Ninguno de los cinco escenarios bajo prueba cifra
 * contraseñas (eso pertenece al login), así que se reemplaza por un doble que
 * conserva la misma semántica: hash() transforma y compare() verifica.
 */
vi.mock('bcrypt', () => {
  const hash = async (texto: string) => `hash:${texto}`
  const compare = async (texto: string, hasheado: string) =>
    hasheado === `hash:${texto}`
  return { default: { hash, compare }, hash, compare }
})
