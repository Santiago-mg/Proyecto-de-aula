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

## Qué NO se trajo: el código de `src/`

La rama de Mario cambia 18 archivos de `src/` (reglas de contraseña, límite de intentos de login, `helmet`, perfil, cabeceras `no-store`). Este back sigue con su `src/`.

Consecuencia: **14 archivos de prueba** de esa rama verifican ese código y no pueden pasar todavía. Están en `tests/pendiente-qa-mario.json`, fuera de `npm test` y del chequeo de tipos, y se corren aparte:

```bash
npm run test:pendiente-qa      # hoy: 57 pasan y 37 fallan, a propósito
```

Archivos pendientes: perfil (`gestion-perfil`, `updateProfile`, `changePassword`), límite de intentos (`fuerza-bruta`, `login-limiter`), `password-policy`, enumeración de usuarios en login, cabeceras de seguridad, seguridad de credenciales, rendimiento, fluent de credenciales, regresión de credenciales y las ampliaciones de ESC-27 y ESC-28 (que esperan `Cache-Control: no-store`).

Para activarlas hay que decidir con Mario qué cambios de `src/` se integran.

## Verificación

`npm test`: 60 archivos, 618 pruebas, todas pasan. `npm run typecheck` sin errores.
