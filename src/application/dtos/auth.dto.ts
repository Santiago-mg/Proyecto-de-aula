import { z } from 'zod'
import {
  MENSAJE_DOMINIO,
  MENSAJES_PASSWORD,
  PASSWORD_MAX,
  PASSWORD_MIN,
  dominioPermitido,
} from '../../domain/credenciales'

// trim + toLowerCase antes de validar: el correo llega normalizado al caso
// de uso, así que el registro, el login y la búsqueda usan la misma forma.
const emailSchema = z.string().trim().toLowerCase().email('Email inválido')

// La lista de dominios solo aplica al crear la cuenta. En el login no se
// exige, para no bloquear cuentas ya existentes (p. ej. admin@celularpro.co).
const emailRegistroSchema = emailSchema.refine(dominioPermitido, {
  message: MENSAJE_DOMINIO,
})

const nombreSchema = z
  .string()
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(80, 'El nombre no puede superar 80 caracteres')

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, MENSAJES_PASSWORD.corta)
  .max(PASSWORD_MAX, MENSAJES_PASSWORD.larga)
  .regex(/[a-z]/, MENSAJES_PASSWORD.minuscula)
  .regex(/[A-Z]/, MENSAJES_PASSWORD.mayuscula)
  .regex(/\d/, MENSAJES_PASSWORD.numero)

export const registerDto = z.object({
  email: emailRegistroSchema,
  name: nombreSchema,
  password: passwordSchema,
})

export const loginDto = z.object({
  email: emailSchema,
  password: z.string().min(1, 'La contraseña es requerida'),
})

// Gestión de perfil. Solo el nombre es editable: el correo es la identidad
// de la cuenta y el rol lo asigna un administrador. Cualquier otro campo del
// body (role, email, banned...) se descarta.
export const updateProfileDto = z.object({
  name: nombreSchema,
})

export const changePasswordDto = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
    newPassword: passwordSchema,
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'La nueva contraseña debe ser distinta de la actual',
    path: ['newPassword'],
  })

export type RegisterDto = z.infer<typeof registerDto>
export type LoginDto = z.infer<typeof loginDto>
export type UpdateProfileDto = z.infer<typeof updateProfileDto>
export type ChangePasswordDto = z.infer<typeof changePasswordDto>
