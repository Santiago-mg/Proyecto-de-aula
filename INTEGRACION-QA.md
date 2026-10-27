# Integración de `pruebas-qa-mario` en este back

Qué se trajo de la rama `pruebas-qa-mario` (commit `f34db91`, MarioFer299) a la rama `integracion-qa`, qué se dejó por fuera y por qué. La carpeta `frontend/` de esa rama (una copia del front) **no se trajo**.

## Qué se incorporó

| Carpeta o archivo | Qué es |
|---|---|
| `tests/unit/gestion-usuarios/` (ban y unban), `tests/escenarios/esc-26-banear-usuario-ampliacion.test.ts` | Ampliación de las pruebas de banear y desbanear |
| `tests/fluent/asserciones-fluidas.test.ts`, `tests/regression/regresion.test.ts` | Aserciones fluidas y regresión |
| `tests/carga/` + `vitest.carga.config.ts` | Carga con autocannon (`npm run test:carga`, fuera de `npm test`) |
| `api-momentic/` | Contratos de la API con Momentic |
| `reportportal/` | Integración con ReportPortal (reporter de Vitest, simulador, importador de JUnit) |
| `docs/matriz-de-trazabilidad/`, `docs/pruebas/`, `docs/evidencias/` | Matriz de trazabilidad, documentación de regresión, seguridad y rendimiento |
| `scripts/criterios.mjs`, `scripts/catalogo-pruebas.mjs`, `HERRAMIENTAS-IA.md` | Scripts y guía de herramientas |

## Qué se ajustó

- `package.json`: scripts (`test:unit`, `test:api`, `test:fluent`, `test:seguridad`, `test:rendimiento`, `test:carga`, `test:pendiente-qa`, `criterio1` a `criterio5`, `rp:*`, `momentic:*`) y dependencias (`autocannon`, `@reportportal/agent-js-vitest`). Se conservaron los scripts de regresión de Santiago y Mario y la versión de `chai` de este back; `helmet` no se agregó porque este código no lo usa.
- `vitest.config.ts`: reporter de ReportPortal (solo si hay `RP_API_KEY`) y JUnit en CI.
- `tsconfig.test.json`, `.gitignore`, `package-lock.json`.

No se tocaron `Dockerfile`, `.dockerignore`, `Jenkinsfile` ni `sonar-project.properties`: los de la rama de Mario son distintos (por ejemplo su `.dockerignore` ya no excluye `team-credentials.txt`).

## El código de `src/` de Mario (ya integrado)

La rama de Mario cambia 18 archivos de `src/`: reglas de contraseña y de dominios de correo, normalización del correo, límite de intentos de login (429 con `Retry-After`), `helmet`, `Cache-Control: no-store`, perfil (`PATCH /auth/me`, `PUT /auth/me/password`) y la regla "no se banea a un administrador" (403). Antes no se había traído y 14 archivos de prueba quedaban en `tests/pendiente-qa-mario.json`. Ahora sí está, porque el front y las pruebas de Cypress de post-despliegue dependen de ese comportamiento (sin él, el perfil devolvía 404 en el despliegue de Docker).

Cómo se integró, sin pisar lo que ya tenía este back:

- Se aplicó el diff de `src/` de Mario (respecto a la base común) con fusión de tres vías. El único conflicto fue `error.middleware.ts`: ambos lados arreglaron lo mismo (JSON mal formado → 400, cuerpo grande → 413); se conservó la versión de este back, que ya tenía pruebas propias.
- Se **conservó `asyncHandler`** en todas las rutas (el diff de Mario lo quitaba porque su rama es anterior a ese cambio; sin él, un error async en Express 4 no llega al manejador). Las rutas nuevas de perfil también lo usan.
- Se agregó la dependencia `helmet` (8.3.0).
- Se actualizaron las 16 pruebas que esperaban el comportamiento anterior: datos de registro válidos (dominio permitido, contraseña con mayúscula, minúscula y número), el esquema de correo (dominios solo en el registro; el login no los exige), y las de ESC-26, porque el baneo ahora filtra por `role: 'USER'` y distingue 404 (no existe) de 403 (es administrador). Se agregó el camino 8 de ESC-26 y el fixture `autenticarAdminConDirectorio`.
- Las 14 pruebas pendientes y las 9 de `tests/regresion/mario/` entraron a `npm test`; se eliminaron `tests/pendiente-qa-mario.json`, `vitest.pendiente-qa.config.ts` y `vitest.pendiente.config.ts`.
- `tests/setup.ts` reinicia el limitador de intentos entre pruebas.

## Verificación

`npm test`: 75 archivos, 768 pruebas, todas pasan. `npm run test:regresion`: 286 (Santiago) + 20 (Mario). `npm run typecheck` sin errores.
