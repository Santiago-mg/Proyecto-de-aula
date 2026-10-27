import { Given, Then, When } from '@cucumber/cucumber'
import { and, containAtLeastOneItemThat, Ensure, equals, includes, matches, not } from '@serenity-js/assertions'
import { Actor, actorInTheSpotlight, Wait } from '@serenity-js/core'
import { By, isVisible, Navigate, PageElement, PageElements } from '@serenity-js/web'

import { Preguntas } from '../../screenplay/questions/Preguntas'
import { AjustarStockPorApi, IdentificarCelularDePrueba } from '../../screenplay/tasks/Api'
import {
  AbrirPagina,
  CambiarNombre,
  CambiarPassword,
  CambiarRolDesdeElPanel,
  EditarInventarioDesdeElFormulario,
  IngresarAlPanel,
} from '../../screenplay/tasks/Tareas'
import { ADMIN } from '../../support/config'
import { cuentaDe, memoria } from '../../support/memoria'

// ─── Gestión de perfil ───────────────────────────────────────────────────

When('{persona} cambia su nombre a {string}', async (actor: Actor, nombre: string) => {
  await actor.attemptsTo(CambiarNombre.a(nombre))
})

When('{persona} cambia su contraseña {string} por {string}', async (actor: Actor, actual: string, nueva: string) => {
  await actor.attemptsTo(CambiarPassword.de(actual).a(nueva))
})

Then('{persona} ve la confirmación {string}', async (actor: Actor, texto: string) => {
  const aviso = PageElements.located(By.xpath(`//*[text()[contains(., "${texto}")]]`))
    .first()
    .describedAs(`aviso "${texto}"`)
  await actor.attemptsTo(Wait.until(aviso, isVisible()))
})

// ─── Control de roles ────────────────────────────────────────────────────

Given('que {persona} ingresó como administrador', async (actor: Actor) => {
  await actor.attemptsTo(IngresarAlPanel.con(ADMIN.email, ADMIN.password))
})

When('{persona} abre {string}', async (actor: Actor, ruta: string) => {
  await actor.attemptsTo(AbrirPagina.en(ruta))
})

Given('que {persona} cambió el rol de {word} a {rol}', async (actor: Actor, otro: string, rol: 'ADMIN' | 'USER') => {
  await actor.attemptsTo(CambiarRolDesdeElPanel.de(cuentaDe(otro).email).a(rol))
})

When('{persona} cambia el rol de {word} a {rol}', async (actor: Actor, otro: string, rol: 'ADMIN' | 'USER') => {
  await actor.attemptsTo(CambiarRolDesdeElPanel.de(cuentaDe(otro).email).a(rol))
})

Then('{persona} ve la página {string}', async (actor: Actor, titulo: string) => {
  await actor.attemptsTo(Ensure.eventually(Preguntas.tituloDeLaPagina(), equals(titulo)))
})

Then('{persona} ve el panel de administración', async (actor: Actor) => {
  await actor.attemptsTo(
    Ensure.eventually(Preguntas.rutaActual(), equals('/admin')),
    // El título se ve en mayúsculas por CSS; se compara sin distinguirlas.
    Ensure.eventually(Preguntas.tituloDelPanelAdmin(), matches(/^panel$/i)),
  )
})

// ─── Alerta de stock bajo ────────────────────────────────────────────────

const alertasCargadas = () =>
  PageElement.located(By.css('[data-alertas-cargadas="true"]')).describedAs('panel con las alertas ya consultadas')

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function nombreDelCelular(): string {
  if (!memoria.celular) throw new Error('El escenario no preparó el celular de prueba')
  return memoria.celular.name
}

Given('que el celular de prueba queda con {int} unidades', async (stock: number) => {
  await actorInTheSpotlight().attemptsTo(AjustarStockPorApi.a(stock))
})

When('{persona} abre el panel de administración', async (actor: Actor) => {
  await actor.attemptsTo(Navigate.to('/admin'), Wait.until(alertasCargadas(), isVisible()))
})

Then(
  '{persona} ve una alerta {string} del celular de prueba con el texto {string}',
  async (actor: Actor, tipo: string, texto: string) => {
    await actor.attemptsTo(
      Ensure.eventually(
        Preguntas.alertasDeInventario(),
        // La etiqueta se ve en mayúsculas por CSS (text-transform) y innerText
        // devuelve lo que se ve: se compara sin distinguir mayúsculas.
        containAtLeastOneItemThat(
          and(matches(new RegExp(escaparRegex(tipo), 'i')), includes(nombreDelCelular()), includes(texto)),
        ),
      ),
    )
  },
)

Then('{persona} no ve ninguna alerta del celular de prueba', async (actor: Actor) => {
  await actor.attemptsTo(
    Wait.until(alertasCargadas(), isVisible()),
    Ensure.that(Preguntas.alertasDeInventario(), not(containAtLeastOneItemThat(includes(nombreDelCelular())))),
  )
})

When(
  '{persona} edita el celular de prueba con {int} unidades y un mínimo de {int}',
  async (actor: Actor, stock: number, minimo: number) => {
    await actor.attemptsTo(IdentificarCelularDePrueba())
    await actor.attemptsTo(EditarInventarioDesdeElFormulario.de(nombreDelCelular()).con(stock, minimo))
  },
)
