# Criterio 3 — UX, heurísticas de Nielsen, accesibilidad e interfaz

Este documento reúne cuatro evaluaciones complementarias:

1. Recorridos de usuario de las seis funcionalidades.
2. Evaluación heurística (10 heurísticas de Nielsen) con análisis apoyado por IA,
   contrastado con verificaciones automáticas y con la revisión del equipo.
3. Accesibilidad automatizada (axe-core, WCAG 2.1 A/AA) antes y después de corregir.
4. Pruebas de interfaz: diseño adaptable, teclado, estados de error y retroalimentación.

Escala de severidad (Nielsen): **0** no es problema · **1** cosmético · **2** menor ·
**3** mayor (prioridad alta) · **4** catástrofe (corregir antes de publicar).

---

## 1. Recorridos evaluados

Cada recorrido se ejecuta automáticamente en las E2E (Screenplay y Katalon); la
duración es la de la última ejecución en modo simulado.

| ID | Recorrido | Pasos del usuario | Resultado | Evidencia |
|---|---|---|---|---|
| R1 | Registro de usuario | Registro → 4 campos → "Crear cuenta" → panel con saludo | Completo en 1 pantalla. La política de contraseña se ve antes de escribir. | `registro.feature`, TC01, `I3-registro-errores.png` |
| R2 | Inicio de sesión | Ingresar → 2 campos → "Ingresar" → panel | Completo; también solo con teclado (I2). | `inicio-sesion.feature`, TC02, `I2-foco-boton.png` |
| R3 | Gestión de perfil | Panel → "Editar perfil" → nombre → "Guardar nombre" | Confirmación inmediata y el menú se actualiza sin recargar (I4). | `gestion-perfil.feature`, TC04, `I4-perfil-confirmacion.png` |
| R4 | Cambio de contraseña | Perfil → actual + nueva + confirmar → "Cambiar contraseña" | Mensaje persistente de éxito; la anterior deja de servir. | `gestion-perfil.feature`, TC04 |
| R5 | Control de roles | Cliente abre `/admin` → "Acceso no autorizado"; admin promueve → acceso | Mensaje claro con salida ("Volver al inicio"). | `control-roles.feature`, TC05 |
| R6 | Alerta de stock bajo | Admin edita stock → Panel → alerta | La alerta aparece arriba del panel, antes de los indicadores. | `alerta-stock.feature`, TC06 |

## 2. Evaluación heurística con apoyo de IA

### Método

- **Análisis de IA.** Claude (Anthropic) revisó 20 capturas reales (10 pantallas en
  1366×768 y 375×812, carpeta `docs/evidencias/interfaz/`), el código de las
  páginas y los resultados de las pruebas automáticas, y propuso hallazgos por
  heurística con una severidad.
- **Verificación.** Cada hipótesis de la IA se confirmó o se descartó con una
  prueba automática o con revisión del código. La columna "Verificación" dice cuál.
  Una hipótesis se descartó (UX-05) y otra se ajustó (UX-11): la IA no se toma como
  verdad, sino como punto de partida.
- **Revisión del equipo.** Nielsen recomienda de 3 a 5 evaluadores
  independientes. La columna "Equipo" la completa cada integrante sin mirar la
  severidad de la IA; luego se comparan en la tabla de la sección 2.3.

### 2.1 Hallazgos

| ID | Heurística | Hallazgo (análisis IA) | Verificación | Sev. IA | Estado | Equipo |
|---|---|---|---|:---:|---|---|
| UX-01 | H9 Reconocer y recuperarse de errores | Con contraseña incorrecta la página se recargaba y el mensaje "Credenciales inválidas" no llegaba a verse. | **Confirmado.** E2E "Contraseña incorrecta" fallaba con el código anterior (prueba de mutación). | 4 | Corregido | |
| UX-02 | H1 Visibilidad del estado | Al recargar justo después de ingresar, la sesión se perdía y el usuario volvía al login sin explicación. | **Confirmado.** Reproducido 0/6 antes y 6/6 después; prueba unitaria y Cypress (7). | 3 | Corregido | |
| UX-03 | H4 Consistencia / diseño adaptable | En móvil la barra de navegación cortaba "Registrarse", el carrito y el menú. | **Confirmado.** I1-móvil (`I1-antes-de-corregir.txt`). | 3 | Corregido | |
| UX-04 | H2 Relación con el mundo real | El panel mezcla inglés y español: "Dashboard", "Revenue total". El público es de Colombia. | **Confirmado** por código (`AdminDashboard.tsx`, `AdminStats.tsx`, `AdminLayout.tsx`). | 2 | Corregido: "Panel", "Ingresos" | |
| UX-05 | H3 Control y libertad | Ingreso y registro no tienen forma de volver a la tienda. | **Descartado en parte.** El logo enlaza a `/` (`Login.tsx`, línea 47); la vía existe pero no es evidente. Severidad ajustada de 3 a 1. | 3 → 1 | Pendiente: enlace "← Volver a la tienda" | |
| UX-06 | H9 Reconocer y recuperarse de errores | No existe "¿Olvidaste tu contraseña?". Un usuario que la olvida no tiene salida. | **Confirmado.** Sin rutas ni pantallas de recuperación en frontend ni backend. | 3 | Pendiente (requiere correo transaccional, ver recomendaciones) | |
| UX-07 | H5 Prevención de errores | La política de contraseñas solo se conocía al fallar. | **Confirmado** con la versión anterior; ahora la ayuda se ve antes de escribir y es la descripción accesible del campo. | 2 | Corregido | |
| UX-08 | H1 Visibilidad / accesibilidad | Los errores de campo no estaban asociados al campo: un lector de pantalla no los anuncia. | **Confirmado** por código; cubierto por `test/unit/accesibilidad/formularios-aria.test.tsx`. | 3 | Corregido (`aria-invalid`, `aria-describedby`, `role="alert"`) | |
| UX-09 | H5 Prevención de errores | "Confirmar contraseña" vacío no mostraba error. | **Confirmado** por I3 (3 de 4 mensajes). | 1 | Corregido | |
| UX-10 | H3 Control y libertad | Una cuenta suspendida durante la sesión seguía navegando, con errores en cada acción. | **Confirmado**; ahora vuelve al ingreso con el motivo (Cypress regresión 9). | 3 | Corregido | |
| UX-11 | H8 Estético y minimalista | Etiquetas de 9–11 px monoespaciadas en mayúsculas cansan la lectura. | **Parcial.** El contraste se corrigió (WCAG 1.4.3); el tamaño no lo exige WCAG AA, queda como mejora. | 2 | Contraste corregido; tamaño pendiente | |
| UX-12 | H7 Flexibilidad y eficiencia | No hay botón para mostrar la contraseña al escribirla. | Revisión de código. | 1 | Pendiente | |
| UX-13 | H1 Visibilidad del estado | En móvil, la tabla de usuarios se desplaza dentro de su contenedor sin ninguna pista visual de que hay más columnas. | Captura `I1-movil_admin_users.png`. | 1 | Pendiente | |
| UX-14 | H1 Visibilidad del estado | Las alertas de stock aparecen arriba del panel, antes de los indicadores. | Código (`AdminDashboard.tsx`) y E2E. | 0 | Cumple (positivo) | |
| UX-15 | H6 Reconocer antes que recordar | El perfil muestra el correo y el tipo de cuenta; el botón de guardar se habilita solo con cambios. | Cypress `<Profile />` y Vitest. | 0 | Cumple (positivo) | |
| UX-16 | H10 Ayuda y documentación | Los mensajes de error dicen qué hacer ("Usa Gmail, Outlook…", "Intenta de nuevo en 15 minutos"). | E2E y pruebas de seguridad. | 0 | Cumple (positivo) | |

### 2.2 Recomendaciones de los pendientes

- **UX-06 Recuperar contraseña (severidad 3).** Agregar `POST /auth/forgot-password`, que
  responda siempre igual exista o no el correo para no revelar cuentas, y envíe un
  enlace de un solo uso con 30 minutos de vigencia. Agregar también
  `POST /auth/reset-password`, que aplique la misma política de contraseñas y
  el limitador de intentos. Necesita un proveedor de correo, por eso no se
  implementó aquí.
- **UX-05 (1).** Enlace de texto "← Volver a la tienda" sobre la tarjeta de ingreso y de registro.
- **UX-11 (2).** Subir las etiquetas a 12 px como mínimo y reservar las mayúsculas para títulos.
- **UX-12 (1).** Botón "Mostrar" con `aria-pressed` en los campos de contraseña.
- **UX-13 (1).** Sombra o degradado en el borde derecho de las tablas cuando hay desplazamiento.

### 2.3 Contraste IA y equipo (completar)

Cada integrante asigna su severidad (0–4) sin ver la de la IA. Luego se calcula la
mediana del equipo y se discuten las diferencias de 2 o más puntos.

| ID | Sev. IA | Integrante 1 | Integrante 2 | Integrante 3 | Mediana equipo | ¿Coincide con la IA? | Decisión |
|---|:---:|:---:|:---:|:---:|:---:|---|---|
| UX-01 | 4 | | | | | | |
| UX-02 | 3 | | | | | | |
| UX-03 | 3 | | | | | | |
| UX-04 | 2 | | | | | | |
| UX-05 | 1 | | | | | | |
| UX-06 | 3 | | | | | | |
| UX-07 | 2 | | | | | | |
| UX-08 | 3 | | | | | | |
| UX-09 | 1 | | | | | | |
| UX-10 | 3 | | | | | | |
| UX-11 | 2 | | | | | | |
| UX-12 | 1 | | | | | | |
| UX-13 | 1 | | | | | | |

**Contraste ya documentado entre IA y verificación:** de 13 hallazgos negativos, 11
se confirmaron, 1 se descartó en parte (UX-05) y 1 se confirmó solo en parte (UX-11).
La IA acertó en los defectos funcionales, que se pudieron reproducir con pruebas.
Fue menos fiable en lo que depende de la percepción: supuso que no había salida
porque el logo no parece un enlace, cuando sí lo es.

## 3. Accesibilidad automatizada (axe-core, WCAG 2.1 A/AA)

Herramienta: `@axe-core/playwright` en 10 pantallas, con el rol correspondiente
(visitante, cliente, administrador). Comando: `npm --prefix e2e run test:accesibilidad`.

| Etapa | Violaciones graves o críticas | Evidencia |
|---|---:|---|
| Antes | **11** en 10 pantallas | `docs/evidencias/accesibilidad/antes/` |
| Después | **0** en 10 pantallas | `docs/evidencias/accesibilidad/despues/` |

| Regla (WCAG) | Impacto | Causa | Corrección |
|---|---|---|---|
| `color-contrast` (1.4.3) | serious | El token `--ink-faint` (#3f4f6a) daba 2,39:1 sobre el fondo; se usa en pies, ayudas y etiquetas de indicadores. | `#6e7e99`: 4,82:1 y 4,53:1 sobre los dos fondos, todavía más tenue que el texto secundario. |
| `color-contrast` (1.4.3) | serious | Insignia de rol morada: 4,13:1. | `#b77cf9`: 5,66:1. |
| `link-in-text-block` (1.4.1) | serious | Los enlaces dentro de un párrafo solo se distinguían por el color (2,24:1 frente al texto). | Subrayado en `.cp-link` y foco visible en enlaces, botones y campos. |
| `select-name` (4.1.2) | critical | Los filtros Categoría y Marca no tenían etiqueta asociada. | `htmlFor`/`id` en `PhoneFilters.tsx`. |

Además de axe (que detecta solo una parte de los problemas), se agregaron
pruebas de componente que verifican la descripción accesible de los campos con
error (`test/unit/accesibilidad/`) y la navegación con teclado (I2).

## 4. Pruebas de interfaz

Comando: `npm --prefix e2e run test:interfaz`. Evidencia: `docs/evidencias/interfaz/`.

| ID | Objetivo | Resultado esperado | Resultado obtenido (antes → después) |
|---|---|---|---|
| I1-escritorio | 10 pantallas en 1366×768 | Sin desplazamiento horizontal ni controles cortados | Falla: las tarjetas de categoría se salían → **Pasa** |
| I1-móvil | 10 pantallas en 375×812 | Igual | Falla en 8 pantallas (barra, tablas, tarjetas) → **Pasa** |
| I2 | Ingreso solo con teclado | Orden Email → Contraseña → Ingresar, foco visible, Enter envía | **Pasa** |
| I3 | Registro vacío | 4 errores junto a sus campos, 4 campos `aria-invalid` | 3 de 4 → **Pasa** |
| I4 | Guardar perfil | Confirmación visible y menú actualizado | **Pasa** |

Causas corregidas: una regla `.cp-category-grid` duplicada usaba `1fr` (las columnas
no se encogían), el contenedor del panel no tenía `min-width: 0` y las acciones de
cuenta no cabían en la barra móvil (ahora están en el menú desplegable, que además
incluye el enlace al panel para administradores).
