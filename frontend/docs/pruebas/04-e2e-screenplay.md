# Criterio 4 — E2E con el patrón Screenplay

Serenity/JS 3.48 + Cucumber 13 (Gherkin en español) + Playwright. Código en
`e2e/`; guía de ejecución en `e2e/README.md`.

## Cómo se aplica el patrón

| Elemento de Screenplay | Implementación |
|---|---|
| **Actores** | Carla (cliente) y Andrés (administrador), creados por `Cast` en `features/support/serenity.config.ts`. Los pronombres "ella" y "él" se refieren al último actor nombrado (parámetro `{persona}`). |
| **Habilidades** | `BrowseTheWebWithPlaywright` (usar el navegador) y `CallAnApi` (preparar datos). |
| **Tareas** | `screenplay/tasks/Tareas.ts`: `Registrarse`, `IniciarSesion`, `IngresarAlPanel`, `CerrarSesion`, `CambiarNombre`, `CambiarPassword`, `CambiarRolDesdeElPanel`, `EditarInventarioDesdeElFormulario`. `screenplay/tasks/Api.ts`: `CrearCuentaPorApi`, `SuspenderCuentaPorApi`, `AjustarStockPorApi`. |
| **Interacciones** | Las de Serenity/JS que componen las tareas: `Navigate.to`, `Enter.theValue().into()`, `Clear.theValueOf`, `Click.on`, `Wait.until`. |
| **Preguntas** | `screenplay/questions/Preguntas.ts`: ruta actual, saludo, nombre en el menú, error del servidor, errores de campo, alertas de inventario, título de la página. |
| **Elementos de UI** | `screenplay/ui/Paginas.ts`: localizados por `id`, `role` o `data-testid`, nunca por clases de estilo. |
| **Aserciones** | `Ensure.that` / `Ensure.eventually` con `equals`, `includes`, `matches`, `containAtLeastOneItemThat`, `not`. |

## Escenarios y resultados

26 escenarios, 26 pasan. Cada uno tiene su objetivo, resultado esperado (pasos
"Entonces"), resultado obtenido y captura en [catalogo-pruebas.md](catalogo-pruebas.md#e2e-con-el-patrón-screenplay-serenityjs--cucumber).

| Característica | Exitosos | Alternativos / negativos |
|---|---|---|
| Registro de usuario | Crear una cuenta nueva | El correo ya tiene una cuenta |
| Inicio de sesión | Credenciales correctas; correo con mayúsculas; cerrar sesión | — |
| Validación de credenciales | — | Contraseña incorrecta; 4 contraseñas débiles (Esquema del escenario); dominio no permitido; confirmación distinta; cuenta suspendida |
| Gestión de perfil | Cambiar el nombre; cambiar la contraseña y volver a ingresar | La contraseña anterior deja de funcionar; contraseña actual incorrecta |
| Control de roles | El admin promueve a un cliente | Visitante sin sesión; cliente en `/admin`; el admin le quita el rol a otro |
| Alerta de stock bajo | Llega al mínimo; umbral inclusivo; sin unidades; edición desde el formulario | Reponer cierra la alerta |

## Evidencia

- `docs/evidencias/e2e-screenplay/cucumber.json`: resultado de cada paso, con su duración.
- `docs/evidencias/e2e-screenplay/capturas/`: pantalla final de cada escenario.
- `e2e/reports/serenity-js/`: reporte HTML de Serenity (`npm --prefix e2e run test:report`).

## Calidad de la suite

- **Estabilidad.** Tres corridas completas seguidas, 26/26 en cada una. Una
  intermitencia inicial reveló un defecto real (la sesión se guardaba después de
  pintar) y se corrigió en la aplicación, no en la prueba.
- **Detección.** Al reintroducir el defecto del interceptor, fallaron 3 escenarios.
- **Esperas explícitas.** Para afirmar que una alerta **no** está, primero se espera
  `data-alertas-cargadas="true"`. Sin eso, la prueba podría pasar antes de que llegue
  la respuesta del servidor.
