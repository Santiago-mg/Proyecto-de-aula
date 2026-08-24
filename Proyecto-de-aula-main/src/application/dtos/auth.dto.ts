import { z } from 'zod'

const DOMINIOS_PERMITIDOS = [
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
  'icloud.com',
]
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'El correo es obligatorio')
  .email('Correo electrónico inválido')
  .refine(
    (email) => {
      const dominio = email.split('@')[1]

      return DOMINIOS_PERMITIDOS.includes(
        dominio,
      )
    },
    {
      message:
        'Correo inválido. Usa Gmail, Outlook, Hotmail, Yahoo o iCloud.',
    },
  )

export const registerDto = z.object({
  email: emailSchema,

  name: z
    .string()
    .trim()
    .min(
      2,
      'El nombre debe tener al menos 2 caracteres',
    ),

  password: z
    .string()
    .min(
      8,
      'La contraseña debe tener al menos 8 caracteres',
    ),
})
export const loginDto = z.object({
  email: emailSchema,

  password: z
    .string()
    .min(
      1,
      'La contraseña es requerida',
    ),
})

export type RegisterDto =
  z.infer<typeof registerDto>

export type LoginDto =
  z.infer<typeof loginDto>
