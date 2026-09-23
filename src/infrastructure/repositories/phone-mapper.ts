import { Prisma } from '@prisma/client'
import type { Phone, PhoneListItem } from '../../domain/entities/Phone'

/**
 * Forma en que se lee un celular completo de la base y cómo se traduce al
 * dominio.
 *
 * Vive aparte del repositorio de celulares porque favoritos también devuelve
 * celulares completos: si cada repositorio armara su propio `include` y su
 * propio mapeo, el mismo celular saldría con distinta forma según el endpoint
 * por el que se pidiera.
 */
export const phoneInclude = {
  images: { orderBy: { position: 'asc' as const } },
  colors: true,
  features: { orderBy: { position: 'asc' as const } },
  category: { select: { name: true } },
} satisfies Prisma.PhoneInclude

export type PhoneWithRelations = Prisma.PhoneGetPayload<{
  include: typeof phoneInclude
}>

/**
 * Traduce la fila de Prisma a la entidad del dominio.
 *
 * No es un simple volcado: las características se guardan como filas con
 * posición y hacia afuera viajan como texto plano, que es lo que declara la
 * entidad Phone.
 */
export function mapToPhone(raw: PhoneWithRelations): Phone {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    brand: raw.brand,
    categoryId: raw.categoryId,
    price: raw.price,
    compareAt: raw.compareAt,
    badge: raw.badge,
    stock: raw.stock,
    minStock: raw.minStock,
    condition: raw.condition as Phone['condition'],
    verified: raw.verified,
    batteryHealth: raw.batteryHealth,
    ram: raw.ram,
    storage: raw.storage,
    camera: raw.camera,
    battery: raw.battery,
    screen: raw.screen,
    chip: raw.chip,
    shortDesc: raw.shortDesc,
    longDesc: raw.longDesc,
    heroImage: raw.heroImage,
    images: raw.images.map((img) => ({
      id: img.id,
      url: img.url,
      position: img.position,
    })),
    colors: raw.colors.map((c) => ({
      id: c.id,
      colorId: c.colorId,
      name: c.name,
      hex: c.hex,
    })),
    features: raw.features.map((f) => f.feature),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

/**
 * Columnas que viajan cuando el celular va dentro de una lista.
 *
 * El listado del catálogo y las recomendaciones devuelven la misma ficha
 * resumida, así que comparten proyección: si una de las dos trajera un campo
 * de más o de menos, el mismo celular llegaría al frontend con dos formas
 * distintas según de qué endpoint viniera.
 *
 * `categoryId` se incluye aunque no salga en la respuesta porque es lo que
 * usa la afinidad para saber si dos celulares son de la misma categoría.
 */
export const phoneListSelect = {
  id: true,
  slug: true,
  name: true,
  brand: true,
  price: true,
  compareAt: true,
  badge: true,
  stock: true,
  condition: true,
  verified: true,
  batteryHealth: true,
  storage: true,
  ram: true,
  shortDesc: true,
  heroImage: true,
  categoryId: true,
  category: { select: { name: true } },
} satisfies Prisma.PhoneSelect

export type PhoneListRow = Prisma.PhoneGetPayload<{
  select: typeof phoneListSelect
}>

/** Aplana la categoría a su nombre y descarta lo que no sale al exterior. */
export function mapToListItem(raw: PhoneListRow): PhoneListItem {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    brand: raw.brand,
    price: raw.price,
    compareAt: raw.compareAt,
    badge: raw.badge,
    stock: raw.stock,
    condition: raw.condition as Phone['condition'],
    verified: raw.verified,
    batteryHealth: raw.batteryHealth,
    storage: raw.storage,
    ram: raw.ram,
    shortDesc: raw.shortDesc,
    heroImage: raw.heroImage,
    category: raw.category.name,
  }
}
