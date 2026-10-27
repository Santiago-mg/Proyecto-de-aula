# Pruebas de CelularPro — índice de la rúbrica

Todo se ejecuta y se presenta desde esta carpeta (`Proyecto-de-aula-mario`). El
frontend está en `frontend/` y sus pruebas se lanzan desde aquí con los mismos
comandos.

## Ejecutar

```powershell
npm run instalar             # una vez: backend, frontend, Cypress, E2E y navegador
npm run criterio1            # regresión, API y componentes (incluye Cypress)
npm run criterio2            # seguridad y rendimiento
npm run criterio3            # accesibilidad e interfaz
npm run criterio4            # E2E con Screenplay
npm run criterio5            # E2E con Katalon (intérprete)
npm run criterios            # los cinco seguidos
npm run katalon:servidores   # deja la app corriendo para Katalon Recorder
```

Cada comando levanta los servidores que necesita, guarda la evidencia, vuelve a
generar los catálogos y termina con un resumen ✓/✗. Antes de ejecutarlos, cierre
cualquier terminal que tenga la aplicación abierta (puertos 3101 y 5173).

## Criterios

| Criterio | Documento | Pruebas | Evidencia |
|---|---|---|---|
| 1. Regresión, API y componentes | [01-regresion-api.md](01-regresion-api.md) · [parte del frontend](../../frontend/docs/pruebas/01-regresion-api-componentes.md) | 418 backend (Supertest + Vitest), 132 frontend (Vitest + Testing Library), 45 Cypress | `docs/evidencias/unitarias/`, `frontend/docs/evidencias/unitarias/`, `frontend/docs/evidencias/cypress/` |
| 2. Seguridad y rendimiento | [02-seguridad-rendimiento.md](02-seguridad-rendimiento.md) | 27 de seguridad, 6 escenarios de carga | `docs/evidencias/rendimiento/` |
| 3. UX, heurísticas, accesibilidad e interfaz | [03-ux-heuristicas-accesibilidad-interfaz.md](../../frontend/docs/pruebas/03-ux-heuristicas-accesibilidad-interfaz.md) | 16 hallazgos heurísticos, 10 pantallas WCAG, 5 de interfaz | `frontend/docs/evidencias/accesibilidad/`, `frontend/docs/evidencias/interfaz/` |
| 4. E2E con Screenplay | [04-e2e-screenplay.md](../../frontend/docs/pruebas/04-e2e-screenplay.md) | 26 escenarios | `frontend/docs/evidencias/e2e-screenplay/` |
| 5. E2E con Katalon | [05-e2e-katalon.md](../../frontend/docs/pruebas/05-e2e-katalon.md) | 6 casos, 212 comandos | `frontend/docs/evidencias/katalon/` |

**Objetivo, resultado esperado, resultado obtenido y evidencia de cada prueba:**
[catálogo del backend](catalogo-pruebas.md) y [catálogo del frontend](../../frontend/docs/pruebas/catalogo-pruebas.md).

## Pasos manuales

1. **Katalon Recorder:** ejecute `npm run katalon:servidores` y deje esa terminal
   abierta. En la extensión: **Open Test Suite** →
   `frontend\e2e\katalon\Suite_CelularPro_6_funcionalidades.html` → **Play Suite**.
   Guarde capturas del resultado y del **Log** en `frontend\docs\evidencias\katalon\`.
2. **Revisión del equipo de las heurísticas:** tabla 2.3 del documento del criterio 3.
