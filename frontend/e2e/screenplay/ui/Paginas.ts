import { By, PageElement, PageElements } from '@serenity-js/web'

/**
 * Elementos de la interfaz de CelularPro (Screenplay: "UI targets").
 *
 * Se localizan por id, rol o data-testid, nunca por clases de estilo: un
 * cambio de diseño no debe romper las pruebas. Los ids son los mismos que
 * usa la suite de Katalon Recorder (e2e/katalon/).
 */

export const FormularioIngreso = {
  email: () => PageElement.located(By.id('email')).describedAs('campo Email'),
  password: () => PageElement.located(By.id('password')).describedAs('campo Contraseña'),
  ingresar: () => PageElement.located(By.css('form button[type="submit"]')).describedAs('botón Ingresar'),
  aviso: () => PageElement.located(By.css('[data-testid="aviso-sesion"]')).describedAs('aviso de sesión'),
}

export const FormularioRegistro = {
  nombre: () => PageElement.located(By.id('name')).describedAs('campo Nombre completo'),
  email: () => PageElement.located(By.id('email')).describedAs('campo Email'),
  password: () => PageElement.located(By.id('password')).describedAs('campo Contraseña'),
  confirmar: () => PageElement.located(By.id('confirmPassword')).describedAs('campo Confirmar contraseña'),
  crear: () => PageElement.located(By.css('form button[type="submit"]')).describedAs('botón Crear cuenta'),
}

export const Mensajes = {
  errorDelServidor: () =>
    PageElement.located(By.css('[data-testid="error-servidor"]')).describedAs('mensaje de error del servidor'),
  erroresDeCampo: () => PageElements.located(By.css('.cp-field-error')).describedAs('errores de los campos'),
  confirmacion: () => PageElement.located(By.css('[role="status"]')).describedAs('mensaje de confirmación'),
}

export const Navegacion = {
  enlaceCuenta: () =>
    PageElement.located(By.css('.cp-nav-actions a[href="/dashboard"]')).describedAs('enlace a mi cuenta'),
  salir: () => PageElement.located(By.cssContainingText('.cp-nav-actions button', 'Salir')).describedAs('botón Salir'),
  enlaceAdmin: () => PageElement.located(By.css('.cp-nav-actions a[href="/admin"]')).describedAs('enlace Admin'),
}

export const PanelCliente = {
  saludo: () => PageElement.located(By.css('h1')).describedAs('saludo del panel'),
  editarPerfil: () => PageElement.located(By.css('a[href="/profile"]')).describedAs('enlace Editar perfil'),
}

export const PaginaPerfil = {
  nombre: () => PageElement.located(By.id('profile-name')).describedAs('campo Nombre completo del perfil'),
  guardarNombre: () =>
    PageElement.located(By.cssContainingText('button', 'Guardar nombre')).describedAs('botón Guardar nombre'),
  passwordActual: () => PageElement.located(By.id('current-password')).describedAs('campo Contraseña actual'),
  passwordNueva: () => PageElement.located(By.id('new-password')).describedAs('campo Contraseña nueva'),
  confirmarNueva: () =>
    PageElement.located(By.id('confirm-new-password')).describedAs('campo Repite la contraseña nueva'),
  cambiarPassword: () =>
    PageElement.located(By.cssContainingText('button', 'Cambiar contraseña')).describedAs('botón Cambiar contraseña'),
  rol: () => PageElement.located(By.css('[data-testid="perfil-rol"]')).describedAs('tipo de cuenta'),
}

export const PaginaGeneral = {
  titulo: () => PageElement.located(By.css('h1')).describedAs('título de la página'),
}

export const PanelAdmin = {
  titulo: () => PageElement.located(By.css('h1.cp-admin-page-title')).describedAs('título del panel'),
  panelAlertas: () => PageElement.located(By.css('[data-testid="stock-alerts"]')).describedAs('panel de alertas de inventario'),
  alertas: () => PageElements.located(By.css('[data-testid="stock-alerts"] li')).describedAs('alertas de inventario'),
}

export const PaginaUsuarios = {
  buscador: () => PageElement.located(By.css('input[aria-label="Buscar usuarios"]')).describedAs('buscador de usuarios'),
  filas: () => PageElements.located(By.css('table tbody tr')).describedAs('filas de usuarios'),
}
