# Criterio 5 — E2E con Katalon Recorder

Suite `e2e/katalon/Suite_CelularPro_6_funcionalidades.html` (6 casos, 212
comandos). Guía en `e2e/katalon/README.md`.

## Diseño de la suite

| Aspecto | Cómo se resolvió |
|---|---|
| **Datos** | Correos únicos con `storeEval` (`katalon.<número>@gmail.com`) y la variable `${email}`: la suite se puede repetir sin limpiar la base. |
| **Localizadores** | `id=` en formularios, `css=[data-testid=…]` en mensajes y `xpath` con texto solo donde hace falta ubicar una fila ("la fila que contiene el correo"). Ninguno depende de clases de estilo. |
| **Sincronización** | `waitForElementPresent` antes de cada verificación y después de cada navegación: el panel espera `[data-alertas-cargadas="true"]` y el formulario espera a que cargue el campo `stock`. No se usa `pause`. |
| **Independencia** | Cada caso empieza limpiando la sesión (`runScript localStorage.clear()`). |
| **Verificaciones** | `assertText` (con `glob:`), `assertLocation`, `assertElementPresent` y `assertElementNotPresent`. |

## Casos

| Caso | Positivos | Negativos |
|---|---|---|
| TC01 Registro | Cuenta nueva → panel, nombre en el menú | — |
| TC02 Inicio de sesión | Salir y volver a ingresar | Tras salir, `/dashboard` devuelve a `/login` |
| TC03 Validación de credenciales | — | Contraseña incorrecta, contraseña sin mayúscula, dominio no permitido |
| TC04 Gestión de perfil | Cambiar nombre y contraseña; ingresar con la nueva | La contraseña anterior es rechazada |
| TC05 Control de roles | El admin promueve al cliente y este entra al panel | Visitante y cliente no entran a `/admin` |
| TC06 Alerta de stock | Stock 2 → "Stock bajo"; stock 0 → "Sin stock" | Al reponer, la alerta desaparece |

Objetivo, verificaciones, resultado y captura de cada caso: [catalogo-pruebas.md](catalogo-pruebas.md#e2e-con-katalon-recorder).

## Ejecución y evidencia

- **Intérprete (`npm --prefix e2e run test:katalon`).** Ejecuta el mismo HTML con
  Playwright: 6/6 casos. Guarda el resultado de cada comando y una captura por caso
  en `docs/evidencias/katalon/`. También se probó que el intérprete falla cuando
  un texto esperado no coincide.
- **Katalon Recorder (pendiente).** Abrir la suite en la extensión, con el backend y el
  frontend reales levantados (`npm run dev` en ambos), pulsar **Play Suite** y
  guardar la captura del registro de ejecución de Recorder. Es la evidencia que
  muestra la herramienta pedida en la rúbrica.
