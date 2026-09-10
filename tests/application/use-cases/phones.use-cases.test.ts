import { describe, it, expect, vi } from 'vitest';
import { getPhoneBySlug } from '../../../src/application/use-cases/phones.use-cases.ts';
import type {
  IPhoneRepository,
  PaginatedPhones,
  PhoneFilters,
} from '../../../src/domain/repositories/IPhoneRepository.ts';
import type { Phone } from '../../../src/domain/entities/Phone.ts';

// ─── Fábrica de teléfonos de prueba ─────────────────────────────
let contador = 0;

function makePhone(sobreescrituras: Partial<Phone> = {}): Phone {
  contador += 1;
  const ahora = new Date();
  return {
    id: `telefono-${contador}`,
    slug: `telefono-${contador}`,
    name: 'iPhone de prueba',
    brand: 'Apple',
    categoryId: 'apple',
    price: 1_500_000,
    compareAt: null,
    badge: null,
    stock: 5,
    condition: 'CERTIFIED',
    verified: true,
    batteryHealth: null,
    ram: null,
    storage: '128GB',
    camera: null,
    battery: null,
    screen: null,
    chip: null,
    shortDesc: null,
    longDesc: null,
    heroImage: null,
    images: [],
    colors: [],
    features: [],
    createdAt: ahora,
    updatedAt: ahora,
    ...sobreescrituras,
  };
}

// ─── Repositorio simulado en memoria ────────────────────────────
class IPhoneRepositoryMock implements IPhoneRepository {
  private phones: Phone[];

  constructor(phones: Phone[] = []) {
    this.phones = phones;
  }

  // Implementación completa: busca por slug dentro del arreglo en memoria.
  async findBySlug(slug: string): Promise<Phone | null> {
    return this.phones.find((p) => p.slug === slug) ?? null;
  }

  // Implementación completa: aplica filtros y pagina el resultado.
  async findAll(
    filters: PhoneFilters,
    page: number,
    limit: number,
  ): Promise<PaginatedPhones> {
    const empieza = (page - 1) * limit;

    const coinciden = this.phones.filter((p) => {
      if (filters.category && p.categoryId !== filters.category) return false;
      if (filters.brand && p.brand !== filters.brand) return false;
      if (filters.condition && p.condition !== filters.condition) return false;
      if (filters.verified !== undefined && p.verified !== filters.verified)
        return false;
      if (filters.minPrice !== undefined && p.price < filters.minPrice)
        return false;
      if (filters.maxPrice !== undefined && p.price > filters.maxPrice)
        return false;
      if (filters.search) {
        const termino = filters.search.toLowerCase();
        return (
          p.name.toLowerCase().includes(termino) ||
          p.brand.toLowerCase().includes(termino) ||
          p.slug.toLowerCase().includes(termino)
        );
      }
      return true;
    });

    const data = coinciden.slice(empieza, empieza + limit).map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      price: p.price,
      compareAt: p.compareAt,
      badge: p.badge,
      stock: p.stock,
      condition: p.condition,
      verified: p.verified,
      batteryHealth: p.batteryHealth,
      storage: p.storage,
      ram: p.ram,
      shortDesc: p.shortDesc,
      heroImage: p.heroImage,
      category: p.categoryId,
    }));

    return {
      data,
      meta: {
        total: coinciden.length,
        page,
        limit,
        totalPages: Math.ceil(coinciden.length / limit),
      },
    };
  }

  // Métodos restantes: retornan un valor del tipo esperado para que el código compile.
  async findById(id: string): Promise<Phone | null> {
    return null;
  }

  async create(
    data: Omit<Phone, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Phone> {
    const ahora = new Date();
    return { ...data, id: `telefono-nuevo-${contador}`, createdAt: ahora, updatedAt: ahora };
  }

  async update(
    id: string,
    data: Partial<Omit<Phone, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Phone> {
    return { id, createdAt: new Date(), updatedAt: new Date(), ...data } as Phone;
  }

  async delete(id: string): Promise<void> {}
}

describe('getPhoneBySlug — obtener un celular por su slug', () => {
  it('returns the phone when the slug exists', async () => {
    const telefonos = [
      makePhone({ id: 'p1', slug: 'iphone-15', name: 'iPhone 15' }),
      makePhone({ id: 'p2', slug: 'galaxy-s24', name: 'Galaxy S24' }),
    ];
    const repo = new IPhoneRepositoryMock(telefonos);

    const result = await getPhoneBySlug(repo, 'iphone-15');

    expect(result).toEqual(telefonos[0]);
  });

  it('asks the repository for the exact slug', async () => {
    const repo = new IPhoneRepositoryMock([
      makePhone({ id: 'p1', slug: 'iphone-15' }),
    ]);
    const spy = vi.spyOn(repo, 'findBySlug');

    await getPhoneBySlug(repo, 'iphone-15');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('iphone-15');
  });

  it('throws a 404 AppError when the slug does not exist', async () => {
    const repo = new IPhoneRepositoryMock([
      makePhone({ id: 'p1', slug: 'iphone-15' }),
    ]);

    await expect(getPhoneBySlug(repo, 'galaxy-s24')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Celular no encontrado',
    });
  });

  it('throws 404 when the repository has no phones at all', async () => {
    const repo = new IPhoneRepositoryMock();

    await expect(getPhoneBySlug(repo, 'cualquier-slug')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Celular no encontrado',
    });
  });

  it('matches the slug exactly and not by partial text', async () => {
    const repo = new IPhoneRepositoryMock([
      makePhone({ id: 'p1', slug: 'iphone-15' }),
    ]);

    await expect(getPhoneBySlug(repo, 'iphone-1')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});