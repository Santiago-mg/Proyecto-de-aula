/**
 * Reglas de negocio de las credenciales (funcionalidad: validación de
 * credenciales).
 *
 * Son funciones puras, sin Zod ni Prisma, para que la misma regla la usen los
 * DTO del backend, la copia del frontend (src/validation/credenciales.ts) y
 * las pruebas. Si cambia una regla aquí, debe cambiar también allá: la suite
 * de regresión de ambos proyectos fija estos valores.
 */

/** Dominios con los que se permite crear una cuenta. */
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

/**
 * bcrypt solo considera los primeros 72 bytes: dos contraseñas que comparten
 * esos 72 bytes producirían el mismo hash. Se corta antes para que nadie crea
 * que una contraseña más larga es más segura de lo que realmente es.
 */
export const PASSWORD_MAX = 72

export const MENSAJES_PASSWORD = {
  corta: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`,
  larga: `La contraseña no puede superar ${PASSWORD_MAX} caracteres`,
  minuscula: 'La contraseña debe incluir al menos una letra minúscula',
  mayuscula: 'La contraseña debe incluir al menos una letra mayúscula',
  numero: 'La contraseña debe incluir al menos un número',
} as const

/**
 * El correo se guarda y se busca siempre en minúsculas y sin espacios.
 * Sin esto, "Ana@Gmail.com" y "ana@gmail.com" serían dos cuentas distintas y
 * quien se registró con una no podría ingresar escribiendo la otra.
 */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function dominioPermitido(email: string): boolean {
  const dominio = normalizarEmail(email).split('@')[1] ?? ''
  return (DOMINIOS_PERMITIDOS as readonly string[]).includes(dominio)
}

/**
 * Devuelve los mensajes de las reglas que la contraseña incumple, en un orden
 * fijo. Una lista vacía significa que la contraseña es aceptable.
 */
export function problemasDePassword(password: string): string[] {
  const problemas: string[] = []
  if (password.length < PASSWORD_MIN) problemas.push(MENSAJES_PASSWORD.corta)
  if (password.length > PASSWORD_MAX) problemas.push(MENSAJES_PASSWORD.larga)
  if (!/[a-z]/.test(password)) problemas.push(MENSAJES_PASSWORD.minuscula)
  if (!/[A-Z]/.test(password)) problemas.push(MENSAJES_PASSWORD.mayuscula)
  if (!/\d/.test(password)) problemas.push(MENSAJES_PASSWORD.numero)
  return problemas
}

export function passwordSegura(password: string): boolean {
  return problemasDePassword(password).length === 0
}
