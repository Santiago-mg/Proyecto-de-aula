import { AppError } from '../../domain/AppError'
import type { Phone } from '../../domain/entities/Phone'
import type {
  IPhoneRepository,
  PhoneFilters,
} from '../../domain/repositories/IPhoneRepository'
import type {
  CreatePhoneDto,
  PhonesQueryDto,
  UpdatePhoneDto,
} from '../dtos/phone.dto'

export async function getPhones(
  repo: IPhoneRepository,
  query: PhonesQueryDto,
) {
  const filters: PhoneFilters = {
    category: query.category,
    brand: query.brand,
    condition: query.condition,
    verified: query.verified,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    search: query.search,
  }
  return repo.findAll(filters, query.page, query.limit)
}

export async function getPhoneBySlug(repo: IPhoneRepository, slug: string) {
  const phone = await repo.findBySlug(slug)
  if (!phone) throw new AppError('Celular no encontrado', 404)
  return phone
}

export async function getPhoneById(repo: IPhoneRepository, id: string) {
  const phone = await repo.findById(id)
  if (!phone) throw new AppError('Celular no encontrado', 404)
  return phone
}

export async function createPhone(
  repo: IPhoneRepository,
  data: CreatePhoneDto,
): Promise<Phone> {
  return repo.create({
    ...data,
    compareAt: data.compareAt ?? null,
    badge: data.badge ?? null,
    batteryHealth: data.batteryHealth ?? null,
    ram: data.ram ?? null,
    storage: data.storage ?? null,
    camera: data.camera ?? null,
    battery: data.battery ?? null,
    screen: data.screen ?? null,
    chip: data.chip ?? null,
    shortDesc: data.shortDesc ?? null,
    longDesc: data.longDesc ?? null,
    heroImage: data.heroImage ?? null,
  })
}

export async function updatePhone(
  repo: IPhoneRepository,
  id: string,
  data: UpdatePhoneDto,
): Promise<Phone> {
  const phone = await repo.findById(id)
  if (!phone) throw new AppError('Celular no encontrado', 404)
  return repo.update(id, data)
}

export async function deletePhone(
  repo: IPhoneRepository,
  id: string,
): Promise<void> {
  const phone = await repo.findById(id)
  if (!phone) throw new AppError('Celular no encontrado', 404)
  return repo.delete(id)
}
