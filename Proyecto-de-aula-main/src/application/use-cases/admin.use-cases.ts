import { AppError } from '../../domain/AppError'
import type { IAdminRepository } from '../../domain/repositories/IAdminRepository'
import type { BanUserDto, ChangeRoleDto } from '../dtos/admin.dto'

export async function getStats(repo: IAdminRepository) {
  return repo.getStats()
}

export async function listUsers(
  repo: IAdminRepository,
  page: number,
  limit: number,
  search?: string,
) {
  return repo.listUsers(page, limit, search)
}

export async function banUser(
  repo: IAdminRepository,
  userId: string,
  data: BanUserDto,
) {
  return repo.banUser(userId, data.reason)
}

export async function unbanUser(repo: IAdminRepository, userId: string) {
  return repo.unbanUser(userId)
}

export async function changeUserRole(
  repo: IAdminRepository,
  userId: string,
  data: ChangeRoleDto,
  requesterId: string,
) {
  if (userId === requesterId)
    throw new AppError('No puedes cambiar tu propio rol', 400)
  return repo.changeRole(userId, data.role)
}
