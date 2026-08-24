import { z } from 'zod'

export const createOrderDto = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'El nombre es requerido'),
  phone: z.string().min(7, 'Teléfono inválido'),
  address: z.string().min(5, 'La dirección es requerida'),
  city: z.string().min(2, 'La ciudad es requerida'),
  dept: z.string().min(2, 'El departamento es requerido'),
  items: z
    .array(
      z.object({
        phoneId: z.string().uuid('ID de producto inválido'),
        qty: z.number().int().positive('La cantidad debe ser positiva'),
        colorId: z.string().optional(),
        colorName: z.string().optional(),
      }),
    )
    .min(1, 'El pedido debe tener al menos un producto'),
})

export const updateOrderStatusDto = z.object({
  status: z.enum(
    ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    { errorMap: () => ({ message: 'Estado inválido' }) },
  ),
})

export type CreateOrderDto = z.infer<typeof createOrderDto>
export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusDto>
