import { z } from 'zod'

export const banUserDto = z.object({
  reason: z.string().min(4, 'El motivo debe tener al menos 4 caracteres'),
})

export const changeRoleDto = z.object({
  role: z.enum(['USER', 'ADMIN'], {
    errorMap: () => ({ message: 'Rol inválido' }),
  }),
})

export const adminUsersQueryDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  search: z.string().optional(),
})

export type BanUserDto = z.infer<typeof banUserDto>
export type ChangeRoleDto = z.infer<typeof changeRoleDto>
export type AdminUsersQueryDto = z.infer<typeof adminUsersQueryDto>
