import { Prisma } from '@prisma/client'
import type { Phone, PhoneListItem } from '../../domain/entities/Phone'
import type {
  IPhoneRepository,
  PaginatedPhones,
  PhoneFilters,
} from '../../domain/repositories/IPhoneRepository'
import { ordenarPorAfinidad, rangoDePrecio } from '../../domain/recomendaciones'
import prisma from '../database/prisma'
import {
  mapToListItem,
  mapToPhone,
  phoneInclude,
  phoneListSelect,
  type PhoneWithRelations,
} from './phone-mapper'
import { sincronizarAlertas } from './stock-alerts'

/**
 * Cuántos candidatos se traen por cada recomendación pedida.
 *
 * La base sabe filtrar (misma marca, categoría o rango), pero no sabe
 * puntuar: ese orden lo pone el dominio. Si se pidieran exactamente `limit`
 * filas, el recorte lo haría el `take` con el orden de la base y la afinidad
 * llegaría tarde. Se traen unas cuantas de más para que haya algo que ordenar
 * sin llegar a leer el catálogo entero.
 */
const FACTOR_CANDIDATOS = 4

function buildWhere(filters: PhoneFilters): Prisma.PhoneWhereInput {
  const where: Prisma.PhoneWhereInput = {}

  if (filters.category) where.categoryId = filters.category
  if (filters.brand)
    where.brand = { equals: filters.brand, mode: 'insensitive' }
  if (filters.condition)
    where.condition = filters.condition as Prisma.EnumConditionFilter
  if (filters.verified !== undefined) where.verified = filters.verified
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {}
    if (filters.minPrice !== undefined) where.price.gte = filters.minPrice
    if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice
  }
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { brand: { contains: filters.search, mode: 'insensitive' } },
      { shortDesc: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  return where
}

export class PhoneRepository implements IPhoneRepository {
  /**
   * Traduce la fila y deja sus alertas al día.
   *
   * create() y update() son los dos puntos donde un administrador cambia el
   * inventario a mano (dar de alta un modelo agotado, reponer unidades o
   * mover el umbral), así que ambos tienen que reevaluar la alerta. La compra
   * lo hace por su cuenta dentro de su transacción.
   */
  private async mapearYSincronizar(raw: PhoneWithRelations): Promise<Phone> {
    const phone = mapToPhone(raw)
    await sincronizarAlertas(prisma, {
      id: phone.id,
      name: phone.name,
      stock: phone.stock,
      minStock: phone.minStock,
    })
    return phone
  }

  async findAll(
    filters: PhoneFilters,
    page: number,
    limit: number,
  ): Promise<PaginatedPhones> {
    const where = buildWhere(filters)
    const skip = (page - 1) * limit

    const [total, phones] = await Promise.all([
      prisma.phone.count({ where }),
      prisma.phone.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: phoneListSelect,
      }),
    ])

    return {
      data: phones.map(mapToListItem),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }
  }

  /**
   * Celulares parecidos al que el cliente está viendo (funcionalidad 13).
   *
   * El reparto de responsabilidades es a propósito: la base reduce el
   * catálogo a los que comparten *algo* con el celular base, y el dominio
   * decide cuáles se le parecen más. Se descartan el propio celular, que no
   * es una recomendación, y los agotados, que no se pueden comprar.
   */
  async findSimilar(base: Phone, limit: number): Promise<PhoneListItem[]> {
    const { min, max } = rangoDePrecio(base.price)

    const candidatos = await prisma.phone.findMany({
      where: {
        id: { not: base.id },
        stock: { gt: 0 },
        OR: [
          { brand: { equals: base.brand, mode: 'insensitive' } },
          { categoryId: base.categoryId },
          { price: { gte: min, lte: max } },
        ],
      },
      take: limit * FACTOR_CANDIDATOS,
      orderBy: { createdAt: 'desc' },
      select: phoneListSelect,
    })

    return ordenarPorAfinidad(base, candidatos, limit).map(mapToListItem)
  }

  async findBySlug(slug: string): Promise<Phone | null> {
    const phone = await prisma.phone.findUnique({
      where: { slug },
      include: phoneInclude,
    })
    return phone ? mapToPhone(phone) : null
  }

  async findById(id: string): Promise<Phone | null> {
    const phone = await prisma.phone.findUnique({
      where: { id },
      include: phoneInclude,
    })
    return phone ? mapToPhone(phone) : null
  }

  async create(
    data: Omit<Phone, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Phone> {
    const { images, colors, features, ...rest } = data
    const phone = await prisma.phone.create({
      data: {
        ...rest,
        images: { create: images },
        colors: {
          create: colors.map((c) => ({
            colorId: c.colorId,
            name: c.name,
            hex: c.hex,
          })),
        },
        features: {
          create: features.map((feature, position) => ({
            feature,
            position,
          })),
        },
      },
      include: phoneInclude,
    })
    return this.mapearYSincronizar(phone)
  }

  async update(
    id: string,
    data: Partial<Omit<Phone, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Phone> {
    const { images, colors, features, ...rest } = data
    const phone = await prisma.phone.update({
      where: { id },
      data: {
        ...rest,
        ...(images !== undefined && {
          images: { deleteMany: {}, create: images },
        }),
        ...(colors !== undefined && {
          colors: {
            deleteMany: {},
            create: colors.map((c) => ({
              colorId: c.colorId,
              name: c.name,
              hex: c.hex,
            })),
          },
        }),
        ...(features !== undefined && {
          features: {
            deleteMany: {},
            create: features.map((feature, position) => ({
              feature,
              position,
            })),
          },
        }),
      },
      include: phoneInclude,
    })
    return this.mapearYSincronizar(phone)
  }

  async delete(id: string): Promise<void> {
    await prisma.phone.delete({ where: { id } })
  }
}
