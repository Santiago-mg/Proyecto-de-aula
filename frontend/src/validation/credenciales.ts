import { z } from 'zod'

/**
 * Validación de credenciales — copia de las reglas del backend
 * (src/domain/credenciales.ts + src/application/dtos/auth.dto.ts).
 *
 * El servidor es quien decide: estas reglas existen en el frontend para
 * avisar antes de enviar el formulario. Si cambian allá, deben cambiar aquí;
 * test/regression/regresion-credenciales.test.ts fija los mismos valores que
 * la suite de regresión del backend para detectar cualquier desalineación.
 */

export const DOMINIOS_PERMITIDOS = [
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
  'icloud.com',
] as const

export const MENSAJE_DOMINIO =
  'Correo inválido. Usa Gmail, Outlook, Hotmail, Yahoo o iCloud.'

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72

export const MENSAJES_PASSWORD = {
  corta: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`,
  larga: `La contraseña no puede superar ${PASSWORD_MAX} caracteres`,
  minuscula: 'La contraseña debe incluir al menos una letra minúscula',
  mayuscula: 'La contraseña debe incluir al menos una letra mayúscula',
  numero: 'La contraseña debe incluir al menos un número',
} as const

export const AYUDA_PASSWORD =
  'Mínimo 8 caracteres, con mayúscula, minúscula y número'

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function dominioPermitido(email: string): boolean {
  const dominio = normalizarEmail(email).split('@')[1] ?? ''
  return (DOMINIOS_PERMITIDOS as readonly string[]).includes(dominio)
}

/** Correo para iniciar sesión: formato y normalización, sin lista de dominios. */
export const emailLoginSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Email inválido')

/** Correo para crear la cuenta: además exige un dominio permitido. */
export const emailRegistroSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Correo electrónico inválido')
  .refine(dominioPermitido, { message: MENSAJE_DOMINIO })

export const nombreSchema = z
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

export const loginSchema = z.object({
  email: emailLoginSchema,
  password: z.string().min(1, 'La contraseña es requerida'),
})

export const registroSchema = z
  .object({
    name: nombreSchema,
    email: emailRegistroSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export const perfilSchema = z.object({
  name: nombreSchema,
})

export const cambioPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'La nueva contraseña debe ser distinta de la actual',
    path: ['newPassword'],
  })

export type LoginForm = z.infer<typeof loginSchema>
export type RegistroForm = z.infer<typeof registroSchema>
export type PerfilForm = z.infer<typeof perfilSchema>
export type CambioPasswordForm = z.infer<typeof cambioPasswordSchema>
