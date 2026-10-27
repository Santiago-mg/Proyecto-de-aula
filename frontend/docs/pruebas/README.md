# Documentación de pruebas — CelularPro (frontend)

El índice principal está en `docs/pruebas/README.md` de la raíz de
Proyecto-de-aula-mario, desde donde se ejecutan los cinco criterios
(`npm run criterio1` … `criterio5`). Este documento detalla la parte del frontend.

| Criterio | Documento | Herramientas | Estado de ejecución |
|---|---|---|---|
| 1. Regresión, API y componentes | [01-regresion-api-componentes.md](01-regresion-api-componentes.md) y backend `01-regresion-api.md` | Cypress, Vitest, Testing Library, Supertest | Vitest y Supertest ejecutados. **Cypress escrito y compilado, falta ejecutarlo** (ver documento) |
| 2. Seguridad y rendimiento | [02-seguridad-rendimiento.md](../../../docs/pruebas/02-seguridad-rendimiento.md) | Vitest + Supertest, autocannon | Ejecutado |
| 3. UX, heurísticas, accesibilidad e interfaz | [03-ux-heuristicas-accesibilidad-interfaz.md](03-ux-heuristicas-accesibilidad-interfaz.md) | Análisis con IA, axe-core, Playwright | Ejecutado. **Falta la revisión del equipo** (tabla 2.3) |
| 4. E2E con Screenplay | [04-e2e-screenplay.md](04-e2e-screenplay.md) | Serenity/JS, Cucumber, Playwright | Ejecutado |
| 5. E2E con Katalon | [05-e2e-katalon.md](05-e2e-katalon.md) | Katalon Recorder | Ejecutado con el intérprete; **falta ejecutarla en Recorder** para la captura de la extensión |

**Detalle de cada prueba** (objetivo, resultado esperado, resultado obtenido y
evidencia): [catalogo-pruebas.md](catalogo-pruebas.md). Se genera a partir de los
reportes de ejecución; no se edita a mano.

## Regenerar toda la evidencia

```powershell
npm run test:evidencia               # Vitest → docs/evidencias/unitarias/
cd e2e
npm run evidencias                   # Screenplay, Katalon, accesibilidad, interfaz
cd ..
npm run dev                          # en otra terminal, para Cypress de regresión
npm run cy:componentes
npm run cy:regresion
npm run cy:api                       # con el backend o la API simulada levantados
node scripts/catalogo-pruebas.mjs    # vuelve a escribir el catálogo
```

## Evidencia (`docs/evidencias/`)

| Carpeta | Contenido |
|---|---|
| `unitarias/resultado.json` | Reporte JSON de Vitest (132 pruebas) |
| `e2e-screenplay/` | `cucumber.json` y una captura final por escenario |
| `katalon/` | Resultado de cada comando y una captura por caso |
| `accesibilidad/antes/`, `accesibilidad/despues/` | Violaciones WCAG y captura de cada pantalla |
| `interfaz/` | 23 capturas (escritorio, móvil, teclado, errores) y resultado |
| `cypress/` | Videos, capturas y JUnit (se crea al ejecutar Cypress) |
