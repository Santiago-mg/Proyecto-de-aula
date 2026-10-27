/**
 * Datos que un escenario genera y que pasos posteriores necesitan: el correo
 * único de cada actor, su contraseña vigente, el celular de las alertas.
 *
 * Se borra antes de cada escenario (features/support/serenity.config.ts).
 */

export interface Cuenta {
  email: string
  password: string
  name: string
}

export const memoria = {
  cuentas: new Map<string, Cuenta>(),
  celular: undefined as undefined | { id: string; name: string },
  limpiar() {
    this.cuentas.clear()
    this.celular = undefined
  },
}

/** Correo único por ejecución: los escenarios no chocan entre sí ni con datos reales. */
export function correoUnico(nombre: string): string {
  const sufijo = `${Date.now()}${Math.floor(Math.random() * 1000)}`
  return `${nombre.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}.e2e.${sufijo}@gmail.com`
}

export function cuentaDe(actor: string): Cuenta {
  const cuenta = memoria.cuentas.get(actor)
  if (!cuenta) throw new Error(`${actor} todavía no tiene una cuenta en este escenario`)
  return cuenta
}
