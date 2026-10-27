import { Page, Text } from '@serenity-js/web'

import { FormularioIngreso, Mensajes, Navegacion, PaginaGeneral, PaginaPerfil, PanelAdmin, PanelCliente } from '../ui/Paginas'

/** Preguntas: lo que el actor puede observar en la pantalla. */
export const Preguntas = {
  rutaActual: () => Page.current().url().pathname,
  saludo: () => Text.of(PanelCliente.saludo()),
  nombreEnElMenu: () => Text.of(Navegacion.enlaceCuenta()),
  errorDelServidor: () => Text.of(Mensajes.errorDelServidor()),
  erroresDeCampo: () => Text.ofAll(Mensajes.erroresDeCampo()),
  confirmacion: () => Text.of(Mensajes.confirmacion()),
  avisoDeSesion: () => Text.of(FormularioIngreso.aviso()),
  tituloDeLaPagina: () => Text.of(PaginaGeneral.titulo()),
  tituloDelPanelAdmin: () => Text.of(PanelAdmin.titulo()),
  alertasDeInventario: () => Text.ofAll(PanelAdmin.alertas()),
  tipoDeCuenta: () => Text.of(PaginaPerfil.rol()),
}
