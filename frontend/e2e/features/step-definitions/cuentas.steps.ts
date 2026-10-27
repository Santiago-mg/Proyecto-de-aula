import { Given, Then, When } from '@cucumber/cucumber'
import { containAtLeastOneItemThat, Ensure, equals, includes } from '@serenity-js/assertions'
import { Actor, actorInTheSpotlight } from '@serenity-js/core'
import { Navigate } from '@serenity-js/web'

import { Preguntas } from '../../screenplay/questions/Preguntas'
import { CrearCuentaPorApi, SuspenderCuentaPorApi } from '../../screenplay/tasks/Api'
import { CerrarSesion, IngresarAlPanel, IniciarSesion, Registrarse } from '../../screenplay/tasks/Tareas'
import { correoUnico, cuentaDe, memoria } from '../../support/memoria'

/** Registro de usuario, inicio de sesión y validación de credenciales. */

function nuevaCuenta(actor: Actor, password: string, nombre = `${actor.name} Rojas`, email = correoUnico(actor.name)) {
  const cuenta = { name: nombre, email, password }
  memoria.cuentas.set(actor.name, cuenta)
  return cuenta
}

// ─── Preparación ─────────────────────────────────────────────────────────

Given('que {persona} ya tiene una cuenta con la contraseña {string}', async (actor: Actor, password: string) => {
  const c = nuevaCuenta(actor, password)
  await actor.attemptsTo(CrearCuentaPorApi.con(c.name, c.email, c.password))
})

Given('que {persona} ingresó a su panel con la contraseña {string}', async (actor: Actor, password: string) => {
  await actor.attemptsTo(IngresarAlPanel.con(cuentaDe(actor.name).email, password))
})

Given('que su cuenta fue suspendida por {string}', async (motivo: string) => {
  const actor = actorInTheSpotlight()
  await actor.attemptsTo(SuspenderCuentaPorApi.de(cuentaDe(actor.name).email, motivo))
})

// ─── Acciones ────────────────────────────────────────────────────────────

When('{persona} se registra con el nombre {string} y la contraseña {string}', async (actor: Actor, nombre: string, password: string) => {
  const c = nuevaCuenta(actor, password, nombre)
  await actor.attemptsTo(Registrarse.con(c.name, c.email, c.password))
})

When('{persona} se registra con el correo {string} y la contraseña {string}', async (actor: Actor, email: string, password: string) => {
  const c = nuevaCuenta(actor, password, undefined, email)
  await actor.attemptsTo(Registrarse.con(c.name, c.email, c.password))
})

When('{persona} se registra con la contraseña {string} y la confirmación {string}', async (actor: Actor, password: string, confirmacion: string) => {
  const c = nuevaCuenta(actor, password)
  await actor.attemptsTo(Registrarse.con(c.name, c.email, password, confirmacion))
})

When('{persona} intenta registrarse otra vez con el mismo correo', async (actor: Actor) => {
  const c = cuentaDe(actor.name)
  await actor.attemptsTo(Registrarse.con(c.name, c.email, c.password))
})

When('{persona} inicia sesión con la contraseña {string}', async (actor: Actor, password: string) => {
  await actor.attemptsTo(IniciarSesion.con(cuentaDe(actor.name).email, password))
})

When(
  '{persona} inicia sesión escribiendo su correo en mayúsculas y la contraseña {string}',
  async (actor: Actor, password: string) => {
    await actor.attemptsTo(IniciarSesion.con(cuentaDe(actor.name).email.toUpperCase(), password))
  },
)

When('{persona} ingresa a su panel con la contraseña {string}', async (actor: Actor, password: string) => {
  await actor.attemptsTo(IngresarAlPanel.con(cuentaDe(actor.name).email, password))
})

When('{persona} cierra la sesión', async (actor: Actor) => {
  await actor.attemptsTo(CerrarSesion())
})

// ─── Verificaciones ──────────────────────────────────────────────────────

Then('{persona} ve su panel con el saludo {string}', async (actor: Actor, saludo: string) => {
  await actor.attemptsTo(
    Ensure.eventually(Preguntas.rutaActual(), equals('/dashboard')),
    Ensure.eventually(Preguntas.saludo(), includes(saludo)),
  )
})

Then('el menú muestra su nombre {string}', async (nombre: string) => {
  await actorInTheSpotlight().attemptsTo(Ensure.eventually(Preguntas.nombreEnElMenu(), equals(nombre)))
})

Then('{persona} ve el error del servidor {string}', async (actor: Actor, mensaje: string) => {
  await actor.attemptsTo(Ensure.eventually(Preguntas.errorDelServidor(), equals(mensaje)))
})

Then('{persona} ve el aviso del campo {string}', async (actor: Actor, mensaje: string) => {
  await actor.attemptsTo(Ensure.eventually(Preguntas.erroresDeCampo(), containAtLeastOneItemThat(equals(mensaje))))
})

Then(/^(?:él|ella) (?:sigue|está) en la página "([^"]*)"$/, async (ruta: string) => {
  await actorInTheSpotlight().attemptsTo(Ensure.eventually(Preguntas.rutaActual(), equals(ruta)))
})

Then('al abrir {string} la aplicación la devuelve a {string}', async (ruta: string, destino: string) => {
  await actorInTheSpotlight().attemptsTo(
    Navigate.to(ruta),
    Ensure.eventually(Preguntas.rutaActual(), equals(destino)),
  )
})
