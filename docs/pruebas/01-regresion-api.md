# Criterio 1 — Regresión y API (backend)

La parte de componentes y la de Cypress están en
[frontend/docs/pruebas/01-regresion-api-componentes.md](../../frontend/docs/pruebas/01-regresion-api-componentes.md).

## Alcance

| Tipo | Herramienta | Carpeta | Pruebas | Resultado |
|---|---|---|---:|---|
| API (servicios) | Supertest sobre la app Express real | `tests/escenarios/` | 162 | 162/162 |
| Unitarias | Vitest | `tests/unit/` | 183 | 183/183 |
| Regresión | Vitest + Supertest | `tests/regression/` | 20 | 20/20 |
| Aserciones fluidas | Chai | `tests/fluent/` | 22 | 22/22 |

Cobertura: **100 %** de líneas, ramas y funciones sobre `src/`. Las pruebas de API
ejecutan de verdad las rutas, los middlewares, la validación, los casos de uso y
los repositorios; solo la base de datos se sustituye por un doble programable
(`tests/helpers/prisma-mock.ts`), así que corren sin Postgres y son reproducibles.

## Casos representativos por funcionalidad

Objetivo, aserciones y resultado de las 418 pruebas: [catalogo-pruebas.md](catalogo-pruebas.md).

| Funcionalidad | Caso positivo (resultado esperado) | Caso negativo (resultado esperado) | Obtenido |
|---|---|---|---|
| Registro | `POST /auth/register` válido → 201, usuario sin contraseña, token | Correo existente → 409; dominio o contraseña inválidos → 400 con el campo | Pasa |
| Inicio de sesión | Credenciales correctas, aun con el correo en mayúsculas → 200 | Contraseña incorrecta o correo inexistente → mismo 401 y mismo mensaje | Pasa |
| Gestión de perfil | `PATCH /auth/me` → 200 con el nombre nuevo; `PUT /auth/me/password` → 204 | Nombre corto → 400; contraseña actual incorrecta → 400 (no 401) | Pasa |
| Validación de credenciales | Contraseña de 8 a 72 caracteres con mayúscula, minúscula y número | Cada regla incumplida devuelve su mensaje | Pasa |
| Control de roles | Admin → 200 en `/admin/*` | Cliente → 403; token con rol ADMIN de un usuario que hoy es USER → 403 | Pasa |
| Alerta de stock | Stock ≤ mínimo → alerta LOW_STOCK; 0 → OUT_OF_STOCK | Reponer cierra la alerta | Pasa |

## Regresión

`tests/regression/` fija los valores de los que depende el negocio (dominios,
longitudes, mínimo de stock por defecto) y un caso por cada defecto corregido:
correo con mayúsculas, lista de dominios y política aplicadas en el servidor,
JSON malformado que respondía 500, y la existencia de los endpoints de perfil.
Los nombres de las pruebas (`regresion_...`) dicen qué protegen, así que el
reporte identifica la regresión sin abrir el código.
