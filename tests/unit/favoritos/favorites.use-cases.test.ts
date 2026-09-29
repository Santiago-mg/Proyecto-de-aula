import { expect } from 'chai'
import { beforeEach, describe, it, vi } from 'vitest'
import {
  addFavorite,
  getMyFavorites,
  removeFavorite,
} from '../../../src/application/use-cases/favorites.use-cases'
import type { Phone } from '../../../src/domain/entities/Phone'
import type { IFavoriteRepository } from '../../../src/domain/repositories/IFavoriteRepository'
import type { IPhoneRepository } from '../../../src/domain/repositories/IPhoneRepository'
import { capturarError } from '../../helpers/errores'

/**
 * Casos de uso de favoritos, aislados de Express y de Prisma.
 *
 * Aquí los repositorios se inyectan por parámetro, así que basta con pasar
 * dobles que cumplan la interfaz: no hace falta el doble del cliente Prisma
 * ni levantar la aplicación.
 */

const USER_ID = 'user-1'
const PHONE_ID = 'phone-1'

function dobleFavoritos(): IFavoriteRepository {
  return {
    add: vi.fn(),
    remove: vi.fn(),
    findByUser: vi.fn(),
  }
}

function dobleCelulares(): IPhoneRepository {
  return {
    findAll: vi.fn(),
    findBySlug: vi.fn(),
    findById: vi.fn(),
    findSimilar: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
}

describe('addFavorite', () => {
  let favoritos: IFavoriteRepository
  let celulares: IPhoneRepository

  beforeEach(() => {
    favoritos = dobleFavoritos()
    celulares = dobleCelulares()
  })

  it('si el celular no existe → 404 y no se escribe nada', async () => {
    // Arrange
    vi.mocked(celulares.findById).mockResolvedValue(null)

    // Act
    const error = await capturarError(
      addFavorite(favoritos, celulares, USER_ID, 'inexistente'),
    )

    // Assert
    expect(error).to.deep.include({
      message: 'Celular no encontrado',
      statusCode: 404,
    })

    expect(vi.mocked(favoritos.add).mock.calls).to.be.empty
  })

  it('si el celular existe, lo marca para ese usuario', async () => {
    // Arrange
    vi.mocked(celulares.findById).mockResolvedValue({
      id: PHONE_ID,
    } as Phone)

    // Act
    await addFavorite(favoritos, celulares, USER_ID, PHONE_ID)

    // Assert
    expect(vi.mocked(favoritos.add).mock.calls).to.deep.include([USER_ID, PHONE_ID])
  })

  it('comprueba el catálogo antes de escribir, no después', async () => {
    // Arrange
    const orden: string[] = []
    vi.mocked(celulares.findById).mockImplementation(async () => {
      orden.push('buscar celular')
      return { id: PHONE_ID } as Phone
    })
    vi.mocked(favoritos.add).mockImplementation(async () => {
      orden.push('marcar favorito')
    })

    // Act
    await addFavorite(favoritos, celulares, USER_ID, PHONE_ID)

    // Assert
    expect(orden).to.deep.equal(['buscar celular', 'marcar favorito'])
  })
})

describe('removeFavorite', () => {
  let favoritos: IFavoriteRepository

  beforeEach(() => {
    favoritos = dobleFavoritos()
  })

  it('pide quitar la marca de ese usuario y ese celular', async () => {
    // Act
    await removeFavorite(favoritos, USER_ID, PHONE_ID)

    // Assert
    expect(vi.mocked(favoritos.remove).mock.calls).to.deep.include([USER_ID, PHONE_ID])
  })

  it('no comprueba que el celular exista: quitar es idempotente por diseño', async () => {
    // Act
    const resultado = await removeFavorite(favoritos, USER_ID, 'nunca-estuvo')

    // Assert
    expect(resultado).to.be.undefined
  })
})

describe('getMyFavorites', () => {
  let favoritos: IFavoriteRepository

  beforeEach(() => {
    favoritos = dobleFavoritos()
  })

  it('consulta la lista del usuario que se le pasa', async () => {
    // Arrange
    vi.mocked(favoritos.findByUser).mockResolvedValue([])

    // Act
    await getMyFavorites(favoritos, USER_ID)

    // Assert
    expect(vi.mocked(favoritos.findByUser).mock.calls).to.deep.include([USER_ID])
  })

  it('sin favoritos devuelve una lista vacía, no null', async () => {
    // Arrange
    vi.mocked(favoritos.findByUser).mockResolvedValue([])

    // Act
    const resultado = await getMyFavorites(favoritos, USER_ID)

    // Assert
    expect(resultado).to.be.an('array').that.is.empty
  })

  it('devuelve los celulares tal como los entrega el repositorio', async () => {
    // Arrange
    const celulares = [
      { id: PHONE_ID, name: 'iPhone 13' },
      { id: 'phone-2', name: 'Galaxy S21' },
    ] as Phone[]
    vi.mocked(favoritos.findByUser).mockResolvedValue(celulares)

    // Act
    const resultado = await getMyFavorites(favoritos, USER_ID)

    // Assert
    expect(resultado).to.deep.equal(celulares)
  })
})
