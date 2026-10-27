# Criterio 1 — Regresión, API y componentes (frontend)

La parte de servicios del backend (API con Supertest) está en
`docs/pruebas/01-regresion-api.md` de la raíz de Proyecto-de-aula-mario.

## Herramientas y alcance

| Tipo | Herramienta | Dónde | Cantidad | Ejecución |
|---|---|---|---:|---|
| Componentes | Vitest + Testing Library | `test/unit/` | 111 | Ejecutado: 111/111 |
| Componentes | Cypress Component Testing | `cypress/component/` | 27 | **Pendiente**: ejecutar `npm run cy:componentes` |
| Servicios (API) | Cypress `cy.request` | `cypress/e2e/api/` | 12 | **Pendiente**: `npm run cy:api` |
| Regresión | Vitest | `test/regression/` | 9 | Ejecutado: 9/9 |
| Regresión | Cypress con `cy.intercept` | `cypress/e2e/regresion/` | 6 | **Pendiente**: `npm run cy:regresion` |
| Aserciones fluidas | Chai | `test/fluent/` | 12 | Ejecutado: 12/12 |

### Por qué Cypress está pendiente

El binario de Cypress se descarga de `download.cypress.io`, un dominio al que el
entorno donde se prepararon las pruebas no tenía acceso. Las 45 pruebas (27 de componentes, 12 de API y 6 de regresión) están
escritas y compilan sin errores (`npm run cy:typecheck`). Siguen los mismos
selectores y mensajes que las pruebas de Vitest y las E2E, que sí se
ejecutaron. Al correrlas, Cypress guarda la evidencia en `docs/evidencias/cypress/`
(video por archivo, captura de cada fallo y reporte JUnit). Después se vuelve a
generar el catálogo con `node scripts/catalogo-pruebas.mjs`.

```powershell
npm ci                         # descarga el binario de Cypress
npm run cy:componentes         # no necesita servidor
npm run dev                    # terminal aparte, para regresión
npm run cy:regresion
npm --prefix e2e run api:simulada   # o el backend real en el puerto 3001
npx cypress run --e2e --spec cypress/e2e/api --env API_URL=http://localhost:3101/api/v1
# Contra el backend real, además se activa la prueba de fuerza bruta:
npx cypress run --e2e --spec cypress/e2e/api --env BACKEND_REAL=true
```

## Casos representativos

El detalle completo está en [catalogo-pruebas.md](catalogo-pruebas.md).

| ID | Tipo | Objetivo | Resultado esperado | Resultado obtenido | Evidencia |
|---|---|---|---|---|---|
| F-UNI login | Componente (+) | Ingresar con el correo en mayúsculas | `login` se llama con `ana@gmail.com` | Pasa | `unitarias/resultado.json` |
| F-UNI login | Componente (−) | 401 del servidor | Se muestra "Credenciales inválidas" | Pasa | idem |
| F-UNI perfil | Componente (+) | Guardar nombre | Se llama `updateProfile('Ana María')` y aparece el aviso | Pasa | idem |
| F-UNI perfil | Componente (−) | Contraseña nueva sin mayúscula | Mensaje de la regla; no se llama a la API | Pasa | idem |
| F-UNI interceptor | Servicio (−) | 401 en `/auth/login` | No redirige ni borra la sesión | Pasa | idem |
| F-UNI interceptor | Servicio (−) | 403 por suspensión | Cierra la sesión y guarda el motivo | Pasa | idem |
| F-ACC formularios | Componente (−) | Email inválido | `aria-invalid="true"` y descripción accesible = mensaje | Pasa | idem |
| F-REG reglas | Regresión | Reglas alineadas con el backend | Mismos 5 dominios, 8–72 caracteres y mensajes idénticos | Pasa | idem |
| F-REG 401 | Regresión | El 401 del login no recarga la página | `window.location.href` sin cambios | Pasa | idem |
| F-CY Register | Cypress (−) | 4 contraseñas débiles | Cada una muestra su regla; no se llama a la API | Pendiente | `cypress/` |
| F-CY API roles | Cypress (−) | Cliente en `/admin/*` | 403 "Acceso restringido a administradores" en 3 rutas | Pendiente | `cypress/` |
| F-CY regresión (7) | Cypress | Recargar justo después de ingresar | Sigue en `/dashboard` con el saludo | Pendiente | `cypress/` |

## Cómo identifican regresiones

- **Valores fijados en los dos proyectos.** Los dominios, los límites de la contraseña y
  los mensajes están en la regresión del backend y en la del frontend: si una
  regla cambia en un solo lado, una de las dos suites falla.
- **Un caso por defecto corregido.** Cada uno de los 12 defectos del README
  general tiene al menos una prueba que falla si reaparece. Se comprobó
  reintroduciendo los defectos 6 y 7 (pruebas de mutación): las pruebas
  fallaron, y volvieron a pasar al restaurar la corrección.
