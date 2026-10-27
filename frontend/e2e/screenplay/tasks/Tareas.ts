import { Ensure, equals, includes, isPresent, not } from '@serenity-js/assertions'
import { Masked, Task, Wait } from '@serenity-js/core'
import { Clear, Click, Enter, Navigate, Page, PageElement, PageElements, By, Text, Value } from '@serenity-js/web'

import {
  FormularioIngreso,
  FormularioRegistro,
  Navegacion,
  PaginaPerfil,
  PaginaUsuarios,
  PanelCliente,
} from '../ui/Paginas'

/** Tareas de negocio que el actor realiza en el navegador. */

export const AbrirPagina = {
  en: (ruta: string) => Task.where(`#actor abre ${ruta}`, Navigate.to(ruta)),
}

export const Registrarse = {
  con: (nombre: string, email: string, password: string, confirmacion = password) =>
    Task.where(
      `#actor se registra como ${email}`,
      Navigate.to('/register'),
      Enter.theValue(nombre).into(FormularioRegistro.nombre()),
      Enter.theValue(email).into(FormularioRegistro.email()),
      Enter.theValue(Masked.valueOf(password)).into(FormularioRegistro.password()),
      Enter.theValue(Masked.valueOf(confirmacion)).into(FormularioRegistro.confirmar()),
      Click.on(FormularioRegistro.crear()),
    ),
}

export const IniciarSesion = {
  con: (email: string, password: string) =>
    Task.where(
      `#actor inicia sesión como ${email}`,
      Navigate.to('/login'),
      Enter.theValue(email).into(FormularioIngreso.email()),
      Enter.theValue(Masked.valueOf(password)).into(FormularioIngreso.password()),
      Click.on(FormularioIngreso.ingresar()),
    ),
}

/** Inicia sesión y espera a estar dentro, para usarlo como precondición. */
export const IngresarAlPanel = {
  con: (email: string, password: string) =>
    Task.where(
      `#actor ingresa a su panel como ${email}`,
      IniciarSesion.con(email, password),
      Wait.until(Page.current().url().pathname, includes('/dashboard')),
      Wait.until(Text.of(PanelCliente.saludo()), includes('Hola')),
    ),
}

export const CerrarSesion = () =>
  Task.where('#actor cierra la sesión', Click.on(Navegacion.salir()))

export const CambiarNombre = {
  a: (nombre: string) =>
    Task.where(
      `#actor cambia su nombre a "${nombre}"`,
      Navigate.to('/profile'),
      Clear.theValueOf(PaginaPerfil.nombre()),
      Enter.theValue(nombre).into(PaginaPerfil.nombre()),
      Click.on(PaginaPerfil.guardarNombre()),
    ),
}

export const CambiarPassword = {
  de: (actual: string) => ({
    a: (nueva: string) =>
      Task.where(
        '#actor cambia su contraseña',
        Navigate.to('/profile'),
        Enter.theValue(Masked.valueOf(actual)).into(PaginaPerfil.passwordActual()),
        Enter.theValue(Masked.valueOf(nueva)).into(PaginaPerfil.passwordNueva()),
        Enter.theValue(Masked.valueOf(nueva)).into(PaginaPerfil.confirmarNueva()),
        Click.on(PaginaPerfil.cambiarPassword()),
      ),
  }),
}

const filaDe = (email: string) =>
  PaginaUsuarios.filas().where(Text, includes(email)).first().describedAs(`fila de ${email}`)

const botonDeRol = (email: string, texto: string) =>
  PageElement.located(By.cssContainingText('button', texto)).of(filaDe(email)).describedAs(`botón "${texto}" de ${email}`)

export const CambiarRolDesdeElPanel = {
  de: (email: string) => ({
    a: (rol: 'ADMIN' | 'USER') => {
      const accion = rol === 'ADMIN' ? 'Hacer admin' : 'Quitar admin'
      const resultado = rol === 'ADMIN' ? 'Quitar admin' : 'Hacer admin'
      return Task.where(
        `#actor cambia el rol de ${email} a ${rol}`,
        Navigate.to('/admin/users'),
        Enter.theValue(email).into(PaginaUsuarios.buscador()),
        Wait.until(botonDeRol(email, accion), isPresent()),
        Click.on(botonDeRol(email, accion)),
        Wait.until(botonDeRol(email, resultado), isPresent()),
      )
    },
  }),
}

export const VerificarQueNoHayAlertaDe = {
  celular: (nombre: string) =>
    Task.where(
      `#actor comprueba que no hay alerta abierta de ${nombre}`,
      Ensure.that(PanelCliente.saludo(), isPresent()),
      Ensure.that(
        PageElement.located(By.cssContainingText('[data-testid="stock-alerts"] li', nombre)),
        not(isPresent()),
      ),
    ),
}

const campoStock = () => PageElement.located(By.id('stock')).describedAs('campo Stock')
const campoMinimo = () => PageElement.located(By.id('minStock')).describedAs('campo Stock mínimo')

export const EditarInventarioDesdeElFormulario = {
  de: (nombre: string) => ({
    con: (stock: number, minimo: number) => {
      const fila = PageElements.located(By.css('table tbody tr'))
        .where(Text, includes(nombre))
        .first()
        .describedAs(`fila de ${nombre}`)
      const editar = PageElement.located(By.css('a[href$="/edit"]')).of(fila).describedAs(`enlace Editar de ${nombre}`)
      return Task.where(
        `#actor deja ${nombre} con ${stock} unidades y un mínimo de ${minimo}`,
        Navigate.to('/admin/phones'),
        Wait.until(editar, isPresent()),
        Click.on(editar),
        // Espera a que el formulario cargue el celular antes de escribir.
        Wait.until(Value.of(campoStock()), not(equals(''))),
        Clear.theValueOf(campoStock()),
        Enter.theValue(String(stock)).into(campoStock()),
        Clear.theValueOf(campoMinimo()),
        Enter.theValue(String(minimo)).into(campoMinimo()),
        Click.on(PageElement.located(By.css('form button[type="submit"]')).describedAs('botón Guardar')),
        Wait.until(Page.current().url().pathname, equals('/admin/phones')),
      )
    },
  }),
}
