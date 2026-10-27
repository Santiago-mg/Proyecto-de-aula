import { Interaction } from '@serenity-js/core'
import { CallAnApi } from '@serenity-js/rest'

import { ADMIN, SLUG_CELULAR_ALERTAS } from '../../support/config'
import { memoria } from '../../support/memoria'

/**
 * Preparación de datos por la API (el "Dado que..." de los escenarios).
 *
 * Arreglar el estado por la API y no por la interfaz hace los escenarios más
 * rápidos y deja la interfaz solo para lo que se quiere comprobar. Funciona
 * igual contra la API simulada y contra el backend real.
 */

type Actor = Parameters<Parameters<typeof Interaction.where>[1]>[0]

async function llamar(actor: Actor, method: string, url: string, data?: unknown, token?: string) {
  const res = await CallAnApi.as(actor).request({
    method,
    url,
    data,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    validateStatus: () => true,
  })
  if (res.status >= 400) {
    throw new Error(`${method} ${url} respondió ${res.status}: ${JSON.stringify(res.data)}`)
  }
  return res
}

async function tokenDeAdmin(actor: Actor): Promise<string> {
  const res = await llamar(actor, 'POST', 'auth/login', ADMIN)
  return res.data.data.token as string
}

async function idDeUsuario(actor: Actor, token: string, email: string): Promise<string> {
  const res = await llamar(actor, 'GET', `admin/users?search=${encodeURIComponent(email)}`, undefined, token)
  const usuario = (res.data.data as Array<{ id: string; email: string }>).find((u) => u.email === email)
  if (!usuario) throw new Error(`No se encontró la cuenta ${email}`)
  return usuario.id
}

export const CrearCuentaPorApi = {
  con: (nombre: string, email: string, password: string) =>
    Interaction.where(`#actor crea la cuenta ${email} por la API`, async (actor) => {
      await llamar(actor, 'POST', 'auth/register', { name: nombre, email, password })
    }),
}

export const SuspenderCuentaPorApi = {
  de: (email: string, motivo: string) =>
    Interaction.where(`#actor suspende la cuenta ${email} por la API`, async (actor) => {
      const token = await tokenDeAdmin(actor)
      const id = await idDeUsuario(actor, token, email)
      await llamar(actor, 'PUT', `admin/users/${id}/ban`, { reason: motivo }, token)
    }),
}

/** Averigua el id y el nombre del celular de prueba (lo guarda en memoria). */
export const IdentificarCelularDePrueba = () =>
  Interaction.where('#actor identifica el celular de prueba', async (actor) => {
    if (memoria.celular) return
    const res = await llamar(actor, 'GET', `phones/${SLUG_CELULAR_ALERTAS}`)
    memoria.celular = { id: res.data.data.id, name: res.data.data.name }
  })

export const AjustarStockPorApi = {
  a: (stock: number) =>
    Interaction.where(`#actor deja el stock del celular de prueba en ${stock}`, async (actor) => {
      const token = await tokenDeAdmin(actor)
      if (!memoria.celular) {
        const res = await llamar(actor, 'GET', `phones/${SLUG_CELULAR_ALERTAS}`)
        memoria.celular = { id: res.data.data.id, name: res.data.data.name }
      }
      await llamar(actor, 'PUT', `phones/${memoria.celular.id}`, { stock, minStock: 5 }, token)
    }),
}
