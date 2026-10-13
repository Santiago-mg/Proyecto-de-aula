import { z } from 'zod'

const REGEX_HTML = /[<>]|javascript:/i

function campoTexto(min: number, mensajeMin: string) {
  return z
    .string()
    .min(min, mensajeMin)
    .refine((valor) => !REGEX_HTML.test(valor), {
      message: 'No se permiten etiquetas HTML ni scripts',
    })
}

export const registerDto = z.object({
  email: z.string().email('Email inválido'),
  name: campoTexto(2, 'El nombre debe tener al menos 2 caracteres'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export const loginDto = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export type RegisterDto = z.infer<typeof registerDto>
export type LoginDto = z.infer<typeof loginDto>
