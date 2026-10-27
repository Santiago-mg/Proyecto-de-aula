# Catálogo de pruebas — Backend CelularPro

Generado el 2026-10-12 con `node scripts/catalogo-pruebas.mjs` a partir
de la evidencia de ejecución. No se edita a mano: si cambian las pruebas, se
vuelve a ejecutar `npm run test:evidencia` y este script.

- **Objetivo:** lo que verifica la prueba (su nombre, dentro de su grupo).
- **Resultado esperado:** las aserciones del código de la prueba.
- **Resultado obtenido:** estado y duración en la última ejecución.
- **Evidencia:** `docs/evidencias/unitarias/resultado.json` (reporte JSON de Vitest) y
  `docs/evidencias/rendimiento/` para la carga.

## Resumen

| Tipo | Archivos | Pruebas |
|---|---:|---:|
| API (Supertest) | 14 | 162 |
| Aserciones fluidas | 2 | 22 |
| Regresión | 2 | 20 |
| Rendimiento (presupuestos) | 1 | 4 |
| Seguridad | 2 | 27 |
| Unitaria | 22 | 183 |
| **Total** | | **418** (418 pasan) |

## Carga (autocannon)

Entorno: Node v22.22.2, 1 núcleo(s), base simulada con 5 ms por consulta, bcrypt nativo, costo 12. Evidencia: `docs/evidencias/rendimiento/resultados-carga.json`.

| ID | Objetivo | Condiciones | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|
| B-CAR-E1 | Comprobar que el listado de celulares atiende a 50 usuarios simultáneos con tiempos bajos y sin errores. | `GET /api/v1/phones?page=1&limit=12`, 50 conexiones, 10 s | p97,5 ≤ 200 ms<br>0 errores (5xx, de red o timeouts)<br>≥ 300 peticiones/s | 27098 peticiones, 2710/s; p50 15 ms, p97,5 52 ms; códigos 200: 27098<br>Cumple: p97,5 ≤ 200 ms<br>Cumple: 0 errores (5xx, de red o timeouts)<br>Cumple: ≥ 300 peticiones/s |
| B-CAR-E2 | Medir el costo real de verificar contraseñas (bcrypt costo 12) con 10 usuarios ingresando a la vez. | `POST /api/v1/auth/login (credenciales correctas)`, 10 conexiones, 10 s | p97,5 ≤ 1500 ms (informativo)<br>0 errores (5xx, de red o timeouts)<br>100 % de respuestas 200 | 36 peticiones, 4/s; p50 2087 ms, p97,5 3163 ms; códigos 200: 36<br>**No cumple**: p97,5 ≤ 1500 ms<br>Cumple: 0 errores (5xx, de red o timeouts)<br>Cumple: 100 % de respuestas 200 |
| B-CAR-E2b | Medir el mismo escenario E2 con contraseñas hasheadas con costo 10, el mínimo recomendado por OWASP. | `POST /api/v1/auth/login (hash con costo 10)`, 10 conexiones, 10 s | p97,5 ≤ 1500 ms<br>0 errores (5xx, de red o timeouts)<br>100 % de respuestas 200 | 150 peticiones, 15/s; p50 707 ms, p97,5 995 ms; códigos 200: 150<br>Cumple: p97,5 ≤ 1500 ms<br>Cumple: 0 errores (5xx, de red o timeouts)<br>Cumple: 100 % de respuestas 200 |
| B-CAR-E3 | Comprobar que la consulta de alertas, que autentica y relee el rol en cada petición, soporta 50 sesiones de administrador. | `GET /api/v1/admin/alerts (token de administrador)`, 50 conexiones, 10 s | p97,5 ≤ 200 ms<br>0 errores (5xx, de red o timeouts)<br>100 % de respuestas 200 | 17184 peticiones, 1719/s; p50 23 ms, p97,5 80 ms; códigos 200: 17184<br>Cumple: p97,5 ≤ 200 ms<br>Cumple: 0 errores (5xx, de red o timeouts)<br>Cumple: 100 % de respuestas 200 |
| B-CAR-E4 | Comprobar que guardar el nombre (validación + autenticación + escritura) soporta 30 usuarios a la vez. | `PATCH /api/v1/auth/me`, 30 conexiones, 10 s | p97,5 ≤ 200 ms<br>0 errores (5xx, de red o timeouts)<br>100 % de respuestas 200 | 19400 peticiones, 1940/s; p50 13 ms, p97,5 31 ms; códigos 200: 19400<br>Cumple: p97,5 ≤ 200 ms<br>Cumple: 0 errores (5xx, de red o timeouts)<br>Cumple: 100 % de respuestas 200 |
| B-CAR-E5 | Simular un ataque de 20 conexiones probando contraseñas sobre una cuenta y verificar que se bloquea con 429 sin degradar el servicio. | `POST /api/v1/auth/login (contraseña incorrecta, misma cuenta)`, 20 conexiones, 8 s | ≥ 95 % de respuestas 429<br>p97,5 ≤ 100 ms (los 429 no ejecutan bcrypt)<br>0 errores (5xx, de red o timeouts) | 6817 peticiones, 852/s; p50 4 ms, p97,5 38 ms; códigos 401: 24, 429: 6793<br>Cumple: ≥ 95 % de respuestas 429<br>Cumple: p97,5 ≤ 100 ms (los 429 no ejecutan bcrypt)<br>Cumple: 0 errores (5xx, de red o timeouts) |

## API (Supertest)

### `tests/escenarios/autenticacion.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-API-001 | POST /auth/register › body inválido → 400 Datos inválidos | `expect(res.status).toBe(400)`<br>`expect(res.body.error).toBe('Datos inválidos')`<br>`expect(prismaMock.user.create).not.toHaveBeenCalled()` | Pasa (35 ms) |
| B-API-002 | POST /auth/register › email ya registrado → 409 | `expect(res.status).toBe(409)`<br>`expect(res.body.error).toBe('El email ya está registrado')` | Pasa (6 ms) |
| B-API-003 | POST /auth/register › datos correctos → 201 con el usuario y su token, sin la contraseña | `expect(res.status).toBe(201)`<br>`expect(res.body.data.user.email).toBe(CREDENCIALES.email)`<br>`expect(res.body.data.user).not.toHaveProperty('password')`<br>(+1 aserciones más) | Pasa (7 ms) |
| B-API-004 | POST /auth/login › credenciales incorrectas → 401 | `expect(res.status).toBe(401)`<br>`expect(res.body.error).toBe('Credenciales inválidas')` | Pasa (4 ms) |
| B-API-005 | POST /auth/login › cuenta suspendida → 403 con el motivo | `expect(res.status).toBe(403)`<br>`expect(res.body.error).toContain('fraude en pagos')` | Pasa (3 ms) |
| B-API-006 | POST /auth/login › credenciales correctas → 200 con el token | `expect(res.status).toBe(200)`<br>`expect(typeof res.body.data.token).toBe('string')`<br>`expect(res.body.data.user).not.toHaveProperty('password')` | Pasa (9 ms) |
| B-API-007 | GET /auth/me › sin token → 401 | `expect(res.status).toBe(401)`<br>`expect(res.body.error).toBe('Token requerido')` | Pasa (3 ms) |
| B-API-008 | GET /auth/me › token con firma inválida → 401 | `expect(res.status).toBe(401)` | Pasa (4 ms) |
| B-API-009 | GET /auth/me › token válido → 200 con el perfil completo leído de la base | `expect(res.status).toBe(200)`<br>`expect(res.body.data).toMatchObject({`<br>`expect(res.body.data).not.toHaveProperty('password')` | Pasa (6 ms) |
| B-API-010 | GET /auth/me › el usuario del token ya no existe → 401 | `expect(res.status).toBe(401)` | Pasa (3 ms) |

### `tests/escenarios/catalogo-publico.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-API-011 | GET /phones — listado público › sin filtros → 200 con la lista paginada y el WHERE vacío | `expect(prismaMock.phone.findMany).toHaveBeenCalledWith(`<br>`expect(res.status).toBe(200)`<br>`expect(res.body.data).toHaveLength(1)`<br>(+1 aserciones más) | Pasa (31 ms) |
| B-API-012 | GET /phones — listado público › limit fuera de rango → 400 Datos inválidos | `expect(res.status).toBe(400)`<br>`expect(res.body.error).toBe('Datos inválidos')`<br>`expect(prismaMock.phone.findMany).not.toHaveBeenCalled()` | Pasa (6 ms) |
| B-API-013 | GET /phones — listado público › verified=false filtra por los NO verificados | `expect(prismaMock.phone.findMany).toHaveBeenCalledWith(` | Pasa (3 ms) |
| B-API-014 | GET /phones — listado público › verified con un valor que no es true/false → 400 | `expect(res.status).toBe(400)` | Pasa (3 ms) |
| B-API-015 | GET /phones — listado público › cada filtro se traduce a su parte del WHERE | `expect(prismaMock.phone.findMany).toHaveBeenCalledWith(` | Pasa (4 ms) |
| B-API-016 | GET /phones — listado público › la segunda página salta los resultados de la primera | `expect(prismaMock.phone.findMany).toHaveBeenCalledWith(`<br>`expect(res.body.meta).toMatchObject({ total: 30, totalPages: 3 })` | Pasa (3 ms) |
| B-API-017 | GET /phones/:slug — detalle público › slug inexistente → 404 | `expect(res.status).toBe(404)`<br>`expect(res.body.error).toBe('Celular no encontrado')` | Pasa (3 ms) |
| B-API-018 | GET /phones/:slug — detalle público › slug existente → 200 con el celular y sus relaciones | `expect(prismaMock.phone.findUnique).toHaveBeenCalledWith(`<br>`expect(res.status).toBe(200)`<br>`expect(res.body.data).toMatchObject({ slug: 'iphone-15' })` | Pasa (9 ms) |
| B-API-019 | GET /phones/id/:id — detalle por UUID (solo admin) › sin token → 401 | `expect(res.status).toBe(401)` | Pasa (3 ms) |
| B-API-020 | GET /phones/id/:id — detalle por UUID (solo admin) › rol USER → 403: expone el registro crudo, así que no es pública | `expect(res.status).toBe(403)` | Pasa (7 ms) |
| B-API-021 | GET /phones/id/:id — detalle por UUID (solo admin) › admin con id inexistente → 404 | `expect(res.status).toBe(404)` | Pasa (4 ms) |
| B-API-022 | GET /phones/id/:id — detalle por UUID (solo admin) › admin con id existente → 200 | `expect(res.status).toBe(200)`<br>`expect(res.body.data.id).toBe(telefono.id)` | Pasa (4 ms) |
| B-API-023 | Rutas que no existen › devuelve 404 Ruta no encontrada | `expect(res.status).toBe(404)`<br>`expect(res.body.error).toBe('Ruta no encontrada')` | Pasa (2 ms) |
| B-API-024 | Rutas que no existen › /health responde ok | `expect(res.status).toBe(200)`<br>`expect(res.body.status).toBe('ok')` | Pasa (2 ms) |

### `tests/escenarios/esc-13-recomendacion-productos.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-API-025 | Camino 1 (1-2-15): el parámetro limit no es válido › limit = 0 → 400 Datos inválidos | `expect(res.status).toBe(400)`<br>`expect(res.body.error).toBe('Datos inválidos')`<br>`expect(prismaMock.phone.findUnique).not.toHaveBeenCalled()`<br>(+1 aserciones más) | Pasa (26 ms) |
| B-API-026 | Camino 1 (1-2-15): el parámetro limit no es válido › limit por encima del tope → 400, el endpoint no es un volcado del catálogo | `expect(res.status).toBe(400)`<br>`expect(res.body.errors).toEqual([` | Pasa (4 ms) |
| B-API-027 | Camino 1 (1-2-15): el parámetro limit no es válido › limit que no es un número → 400 | `expect(res.status).toBe(400)`<br>`expect(prismaMock.phone.findMany).not.toHaveBeenCalled()` | Pasa (3 ms) |
| B-API-028 | Camino 2 (1-3-4-15): el celular base no existe › slug que no está en el catálogo → 404 Celular no encontrado | `expect(res.status).toBe(404)`<br>`expect(res.body.error).toBe('Celular no encontrado')`<br>`expect(prismaMock.phone.findMany).not.toHaveBeenCalled()` | Pasa (3 ms) |
| B-API-029 | Camino 3 (1-3-5-6-13-14-15): no hay candidatos › el catálogo no tiene nada parecido → 200 con lista vacía | `expect(res.status).toBe(200)`<br>`expect(res.body.data).toEqual([])` | Pasa (3 ms) |
| B-API-030 | Puntuación de un candidato (caminos 4 a 7) › Camino 4 (1-3-5-6-7-8-9-10-11-12-6-13-14-15): coincide en marca, categoría y precio | `expect(res.status).toBe(200)`<br>`expect(res.body.data).toHaveLength(1)`<br>`expect(res.body.data[0]).toMatchObject({` | Pasa (4 ms) |
| B-API-031 | Puntuación de un candidato (caminos 4 a 7) › Camino 5 (1-3-5-6-7-9-10-11-12-6-13-14-15): otra marca, misma categoría y precio | `expect(res.status).toBe(200)`<br>`expect(res.body.data[0].id).toBe('otra-marca')` | Pasa (3 ms) |
| B-API-032 | Puntuación de un candidato (caminos 4 a 7) › Camino 6 (1-3-5-6-7-8-9-11-12-6-13-14-15): misma marca, otra categoría, precio dentro | `expect(res.status).toBe(200)`<br>`expect(res.body.data[0].id).toBe('otra-categoria')` | Pasa (13 ms) |
| B-API-033 | Puntuación de un candidato (caminos 4 a 7) › Camino 7 (1-3-5-6-7-8-9-10-11-6-13-14-15): marca y categoría iguales, precio fuera del rango | `expect(res.status).toBe(200)`<br>`expect(res.body.data[0].id).toBe('precio-fuera')` | Pasa (4 ms) |
| B-API-034 | Orden y recorte de la lista (nodo 13) › primero el de más afinidad, aunque la base lo devuelva de último | `expect(res.body.data.map((p: { id: string }) => p.id)).toEqual([` | Pasa (3 ms) |
| B-API-035 | Orden y recorte de la lista (nodo 13) › a igual afinidad, primero el de precio más cercano | `expect(res.body.data.map((p: { id: string }) => p.id)).toEqual([` | Pasa (4 ms) |
| B-API-036 | Orden y recorte de la lista (nodo 13) › devuelve como mucho las que se piden | `expect(res.body.data).toHaveLength(2)` | Pasa (4 ms) |
| B-API-037 | Consulta de candidatos (nodo 5) › descarta el propio celular y los agotados, y busca por marca, categoría o precio | `expect(prismaMock.phone.findMany).toHaveBeenCalledWith(` | Pasa (6 ms) |
| B-API-038 | Consulta de candidatos (nodo 5) › sin limit se piden 4, que es lo que cabe en la fila de la ficha | `expect(prismaMock.phone.findMany).toHaveBeenCalledWith(` | Pasa (3 ms) |
| B-API-039 | Consulta de candidatos (nodo 5) › con limit explícito se piden candidatos en proporción | `expect(prismaMock.phone.findMany).toHaveBeenCalledWith(` | Pasa (3 ms) |
| B-API-040 | Fallos de infraestructura › si se cae la consulta de candidatos → 500 sin filtrar el detalle | `expect(res.status).toBe(500)`<br>`expect(res.body.error).toBe('Error interno del servidor')` | Pasa (17 ms) |

### `tests/escenarios/esc-26-banear-usuario.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-API-041 | ESC-26 — Banear usuario › Camino 1 (1-2-14): sin cabecera Bearer → 401 Token requerido | `expect(res.status).toBe(401)`<br>`expect(res.body.error).toBe('Token requerido')`<br>`expect(prismaMock.user.update).not.toHaveBeenCalled()` | Pasa (32 ms) |
| B-API-042 | ESC-26 — Banear usuario › Camino 2 (1-3-4-14): firma inválida → 401 Token inválido o expirado | `expect(res.status).toBe(401)`<br>`expect(res.body.error).toBe('Token inválido o expirado')`<br>`expect(prismaMock.user.update).not.toHaveBeenCalled()` | Pasa (8 ms) |
| B-API-043 | ESC-26 — Banear usuario › Camino 3 (1-3-5-6-14): rol USER → 403 Acceso restringido | `expect(res.status).toBe(403)`<br>`expect(res.body.error).toBe('Acceso restringido a administradores')`<br>`expect(prismaMock.user.update).not.toHaveBeenCalled()` | Pasa (5 ms) |
| B-API-044 | ESC-26 — Banear usuario › Camino 4 (1-3-5-7-8-14): reason con menos de 4 caracteres → 400 Datos inválidos | `expect(res.status).toBe(400)`<br>`expect(res.body.error).toBe('Datos inválidos')`<br>`expect(prismaMock.user.update).not.toHaveBeenCalled()` | Pasa (6 ms) |
| B-API-045 | ESC-26 — Banear usuario › Camino 5 (1-3-5-7-9-10-14): un admin no puede banearse a sí mismo (RN-05) → 400 | `expect(res.status).toBe(400)`<br>`expect(res.body.error).toBe('No puedes banear tu propia cuenta')`<br>`expect(prismaMock.user.update).not.toHaveBeenCalled()` | Pasa (5 ms) |
| B-API-046 | ESC-26 — Banear usuario › Camino 6 (1-3-5-7-9-11-12-14): el id no existe → 404 Usuario no encontrado | `expect(prismaMock.user.update).toHaveBeenCalledWith(`<br>`expect(res.status).toBe(404)`<br>`expect(res.body.error).toBe('Usuario no encontrado')` | Pasa (14 ms) |
| B-API-047 | ESC-26 — Banear usuario › Camino 7 (1-3-5-7-9-11-13-14): datos correctos → 200 con el usuario baneado | `expect(prismaMock.user.update).toHaveBeenCalledWith(`<br>`expect(res.status).toBe(200)`<br>`expect(res.body.data).toMatchObject({`<br>(+2 aserciones más) | Pasa (6 ms) |

### `tests/escenarios/esc-27-desbanear-usuario.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-API-048 | ESC-27 — Desbanear usuario › Camino 1 (1-2-10): sin cabecera Bearer → 401 Token requerido | `expect(res.status).toBe(401)`<br>`expect(res.body.error).toBe('Token requerido')`<br>`expect(prismaMock.user.update).not.toHaveBeenCalled()` | Pasa (26 ms) |
| B-API-049 | ESC-27 — Desbanear usuario › Camino 2 (1-3-4-10): firma inválida → 401 Token inválido o expirado | `expect(res.status).toBe(401)`<br>`expect(res.body.error).toBe('Token inválido o expirado')`<br>`expect(prismaMock.user.update).not.toHaveBeenCalled()` | Pasa (8 ms) |
| B-API-050 | ESC-27 — Desbanear usuario › Camino 3 (1-3-5-6-10): rol USER → 403 Acceso restringido | `expect(res.status).toBe(403)`<br>`expect(res.body.error).toBe('Acceso restringido a administradores')`<br>`expect(prismaMock.user.update).not.toHaveBeenCalled()` | Pasa (4 ms) |
| B-API-051 | ESC-27 — Desbanear usuario › Camino 4 (1-3-5-7-8-10): el id no existe → 404 Usuario no encontrado | `expect(res.status).toBe(404)`<br>`expect(res.body.error).toBe('Usuario no encontrado')` | Pasa (5 ms) |
| B-API-052 | ESC-27 — Desbanear usuario › Camino 5 (1-3-5-7-9-10): usuario suspendido → 200 y se limpian los tres campos del baneo | `expect(prismaMock.user.update).toHaveBeenCalledWith(`<br>`expect(res.status).toBe(200)`<br>`expect(res.body.data).toMatchObject({` | Pasa (7 ms) |

### `tests/escenarios/esc-28-consultar-usuarios.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-API-053 | ESC-28 — Consultar usuarios › Camino 1 (1-2-14): sin cabecera Bearer → 401 Token requerido | `expect(res.status).toBe(401)`<br>`expect(res.body.error).toBe('Token requerido')`<br>`expect(prismaMock.user.findMany).not.toHaveBeenCalled()` | Pasa (25 ms) |
| B-API-054 | ESC-28 — Consultar usuarios › Camino 2 (1-3-4-14): firma inválida → 401 Token inválido o expirado | `expect(res.status).toBe(401)`<br>`expect(res.body.error).toBe('Token inválido o expirado')`<br>`expect(prismaMock.user.findMany).not.toHaveBeenCalled()` | Pasa (8 ms) |
| B-API-055 | ESC-28 — Consultar usuarios › Camino 3 (1-3-5-6-14): rol USER → 403 Acceso restringido | `expect(res.status).toBe(403)`<br>`expect(res.body.error).toBe('Acceso restringido a administradores')`<br>`expect(prismaMock.user.findMany).not.toHaveBeenCalled()` | Pasa (5 ms) |
| B-API-056 | ESC-28 — Consultar usuarios › Camino 4 (1-3-5-7-8-14): page inválido → 400 Datos inválidos | `expect(res.status).toBe(400)`<br>`expect(res.body.error).toBe('Datos inválidos')`<br>`expect(prismaMock.user.findMany).not.toHaveBeenCalled()` | Pasa (7 ms) |
| B-API-057 | ESC-28 — Consultar usuarios › Camino 5 (1-3-5-7-9-10-12-13-14): con search → 200 con la lista filtrada | `expect(prismaMock.user.findMany).toHaveBeenCalledWith(`<br>`expect(res.status).toBe(200)`<br>`expect(res.body.data).toHaveLength(1)`<br>(+1 aserciones más) | Pasa (8 ms) |
| B-API-058 | ESC-28 — Consultar usuarios › Camino 6 (1-3-5-7-9-11-12-13-14): sin search → 200 con la lista completa paginada | `expect(prismaMock.user.findMany).toHaveBeenCalledWith(`<br>`expect(res.status).toBe(200)`<br>`expect(res.body.data).toHaveLength(3)`<br>(+1 aserciones más) | Pasa (4 ms) |
| B-API-059 | ESC-28 — Consultar usuarios › La contraseña nunca sale en el listado | `expect(res.status).toBe(200)`<br>`expect(res.body.data[0]).not.toHaveProperty('password')` | Pasa (4 ms) |

### `tests/escenarios/esc-29-panel-estadisticas.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-API-060 | ESC-29 — Panel de estadísticas › Camino 1 (1-2-14): sin cabecera Bearer → 401 Token requerido | `expect(res.status).toBe(401)`<br>`expect(res.body.error).toBe('Token requerido')`<br>`expect(prismaMock.order.groupBy).not.toHaveBeenCalled()` | Pasa (25 ms) |
| B-API-061 | ESC-29 — Panel de estadísticas › Camino 2 (1-3-4-14): firma inválida → 401 Token inválido o expirado | `expect(res.status).toBe(401)`<br>`expect(res.body.error).toBe('Token inválido o expirado')`<br>`expect(prismaMock.order.groupBy).not.toHaveBeenCalled()` | Pasa (8 ms) |
| B-API-062 | ESC-29 — Panel de estadísticas › Camino 3 (1-3-5-6-14): rol USER → 403 Acceso restringido | `expect(res.status).toBe(403)`<br>`expect(res.body.error).toBe('Acceso restringido a administradores')`<br>`expect(prismaMock.order.groupBy).not.toHaveBeenCalled()` | Pasa (5 ms) |
| B-API-063 | ESC-29 — Panel de estadísticas › Camino 4 (1-3-5-7-8-9-13-14): sin pedidos → 200 con los ingresos en 0 | `expect(res.status).toBe(200)`<br>`expect(res.body.data.orders).toMatchObject({ total: 0, revenue: 0 })` | Pasa (21 ms) |
| B-API-064 | ESC-29 — Panel de estadísticas › Camino 5 (1-3-5-7-8-9-10-11-9-13-14): pedido no cancelado → suma su total a los ingresos | `expect(res.status).toBe(200)`<br>`expect(res.body.data.orders).toMatchObject({` | Pasa (5 ms) |
| B-API-065 | ESC-29 — Panel de estadísticas › Camino 6 (1-3-5-7-8-9-10-12-9-13-14): pedido cancelado → no se suma a los ingresos | `expect(res.status).toBe(200)`<br>`expect(res.body.data.orders).toMatchObject({` | Pasa (4 ms) |
| B-API-066 | ESC-29 — Panel de estadísticas › Con pedidos mezclados solo suma los que no están cancelados | `expect(res.status).toBe(200)`<br>`expect(res.body.data.orders).toMatchObject({` | Pasa (4 ms) |
| B-API-067 | ESC-29 — Panel de estadísticas › El panel siempre devuelve los 7 días de ingresos | `expect(res.status).toBe(200)`<br>`expect(res.body.data.revenueByDay).toHaveLength(7)` | Pasa (11 ms) |
| B-API-068 | ESC-29 — Panel de estadísticas › Un pedido de hoy aparece en el último día del desglose diario | `expect(res.status).toBe(200)`<br>`expect(dias).toHaveLength(7)`<br>`expect(dias[6]).toMatchObject({ amount: 800_000, count: 1 })` | Pasa (4 ms) |

### `tests/escenarios/esc-30-administracion-catalogo.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-API-069 | ESC-30 — Administración del catálogo › Camino 1 (1-2-19): sin cabecera Bearer → 401 Token requerido | `expect(res.status).toBe(401)`<br>`expect(res.body.error).toBe('Token requerido')`<br>`expect(prismaMock.phone.create).not.toHaveBeenCalled()` | Pasa (32 ms) |
| B-API-070 | ESC-30 — Administración del catálogo › Camino 2 (1-3-4-19): firma inválida → 401 Token inválido o expirado | `expect(res.status).toBe(401)`<br>`expect(res.body.error).toBe('Token inválido o expirado')`<br>`expect(prismaMock.phone.create).not.toHaveBeenCalled()` | Pasa (8 ms) |
| B-API-071 | ESC-30 — Administración del catálogo › Camino 3 (1-3-5-6-19): rol USER → 403 Acceso restringido | `expect(res.status).toBe(403)`<br>`expect(res.body.error).toBe('Acceso restringido a administradores')`<br>`expect(prismaMock.phone.create).not.toHaveBeenCalled()` | Pasa (4 ms) |
| B-API-072 | ESC-30 — Administración del catálogo › Camino 4 (1-3-5-7-8-9-19): POST con body inválido → 400 Datos inválidos | `expect(res.status).toBe(400)`<br>`expect(res.body.error).toBe('Datos inválidos')`<br>`expect(prismaMock.phone.create).not.toHaveBeenCalled()` | Pasa (6 ms) |
| B-API-073 | ESC-30 — Administración del catálogo › Camino 5 (1-3-5-7-8-10-11-19): POST con un slug repetido (RN-01) → 409 Ya existe un celular con ese slug | `expect(res.status).toBe(409)`<br>`expect(res.body.error).toBe('Ya existe un celular con ese slug')`<br>`expect(res.body).not.toHaveProperty('detail')`<br>(+1 aserciones más) | Pasa (5 ms) |
| B-API-074 | ESC-30 — Administración del catálogo › Camino 6 (1-3-5-7-8-10-12-19): POST con body válido y slug libre → 201 celular creado | `expect(res.status).toBe(201)`<br>`expect(res.body.data).toMatchObject({ slug: body.slug, name: body.name })` | Pasa (10 ms) |
| B-API-075 | ESC-30 — Administración del catálogo › Camino 7 (1-3-5-7-13-14-19): PUT sobre un id que no existe → 404 Celular no encontrado | `expect(res.status).toBe(404)`<br>`expect(res.body.error).toBe('Celular no encontrado')`<br>`expect(prismaMock.phone.update).not.toHaveBeenCalled()` | Pasa (4 ms) |
| B-API-076 | ESC-30 — Administración del catálogo › Camino 8 (1-3-5-7-13-15-19): PUT sobre un celular existente → 200 actualizado | `expect(res.status).toBe(200)`<br>`expect(res.body.data.price).toBe(2_000_000)` | Pasa (3 ms) |
| B-API-077 | ESC-30 — Administración del catálogo › Camino 9 (1-3-5-7-16-17-19): DELETE sobre un id que no existe → 404 Celular no encontrado | `expect(res.status).toBe(404)`<br>`expect(res.body.error).toBe('Celular no encontrado')`<br>`expect(prismaMock.phone.delete).not.toHaveBeenCalled()` | Pasa (3 ms) |
| B-API-078 | ESC-30 — Administración del catálogo › Camino 10 (1-3-5-7-16-18-19): DELETE sobre un celular existente → 204 sin contenido | `expect(prismaMock.phone.delete).toHaveBeenCalledWith({`<br>`expect(res.status).toBe(204)`<br>`expect(res.body).toEqual({})` | Pasa (4 ms) |

### `tests/escenarios/esc-31-alertas-stock.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-API-079 | GET /admin/alerts — consultar alertas abiertas › sin token → 401 | `expect(res.status).toBe(401)` | Pasa (26 ms) |
| B-API-080 | GET /admin/alerts — consultar alertas abiertas › usuario sin rol de administrador → 403 | `expect(res.status).toBe(403)`<br>`expect(prismaMock.alert.findMany).not.toHaveBeenCalled()` | Pasa (9 ms) |
| B-API-081 | GET /admin/alerts — consultar alertas abiertas › sin alertas pendientes → 200 con lista vacía | `expect(res.status).toBe(200)`<br>`expect(res.body.data).toEqual([])` | Pasa (5 ms) |
| B-API-082 | GET /admin/alerts — consultar alertas abiertas › devuelve las alertas con los datos del celular | `expect(res.status).toBe(200)`<br>`expect(res.body.data).toHaveLength(1)`<br>`expect(res.body.data[0]).toMatchObject({` | Pasa (5 ms) |
| B-API-083 | GET /admin/alerts — consultar alertas abiertas › solo pide las que siguen sin resolver, de la más reciente a la más antigua | `expect(prismaMock.alert.findMany).toHaveBeenCalledWith(` | Pasa (5 ms) |
| B-API-084 | Una compra levanta la alerta que corresponda › si la compra deja el stock justo en el mínimo → alerta de poco stock | `expect(res.status).toBe(201)`<br>`expect(prismaMock.alert.upsert).toHaveBeenCalledWith(` | Pasa (21 ms) |
| B-API-085 | Una compra levanta la alerta que corresponda › si la compra agota el celular → alerta de agotado | `expect(res.status).toBe(201)`<br>`expect(prismaMock.alert.upsert).toHaveBeenCalledWith(` | Pasa (4 ms) |
| B-API-086 | Una compra levanta la alerta que corresponda › si queda inventario de sobra → no abre ninguna alerta | `expect(res.status).toBe(201)`<br>`expect(prismaMock.alert.upsert).not.toHaveBeenCalled()`<br>`expect(prismaMock.alert.updateMany).toHaveBeenCalledWith({` | Pasa (4 ms) |
| B-API-087 | Una compra levanta la alerta que corresponda › si el pedido se cae por stock insuficiente, no se toca la tabla de alertas | `expect(res.status).toBe(400)`<br>`expect(prismaMock.alert.upsert).not.toHaveBeenCalled()`<br>`expect(prismaMock.alert.updateMany).not.toHaveBeenCalled()` | Pasa (4 ms) |
| B-API-088 | Reponer inventario desde el panel cierra la alerta › al subir el stock por encima del mínimo se resuelven las abiertas | `expect(res.status).toBe(200)`<br>`expect(prismaMock.alert.updateMany).toHaveBeenCalledWith({`<br>`expect(prismaMock.alert.upsert).not.toHaveBeenCalled()` | Pasa (4 ms) |
| B-API-089 | Reponer inventario desde el panel cierra la alerta › si se repone poco, la alerta sigue abierta pero como LOW_STOCK | `expect(prismaMock.alert.upsert).toHaveBeenCalledWith(` | Pasa (3 ms) |
| B-API-090 | Reponer inventario desde el panel cierra la alerta › un celular nuevo dado de alta sin unidades nace con su alerta | `expect(res.status).toBe(201)`<br>`expect(prismaMock.alert.upsert).toHaveBeenCalledWith(` | Pasa (4 ms) |
| B-API-091 | minStock en el catálogo › si no se envía, el celular se crea con el mínimo por defecto (5) | `expect(prismaMock.phone.create).toHaveBeenCalledWith(` | Pasa (4 ms) |
| B-API-092 | minStock en el catálogo › un mínimo negativo se rechaza con 400 | `expect(res.status).toBe(400)`<br>`expect(res.body.error).toBe('Datos inválidos')`<br>`expect(prismaMock.phone.create).not.toHaveBeenCalled()` | Pasa (3 ms) |
| B-API-093 | Fallos de infraestructura al consultar alertas › si la consulta se cae → 500 | `expect(res.status).toBe(500)` | Pasa (15 ms) |

### `tests/escenarios/esc-32-lista-favoritos.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-API-094 | Acceso a la lista › Camino 1: sin cabecera Bearer → 401 Token requerido | `expect(res.status).toBe(401)`<br>`expect(res.body.error).toBe('Token requerido')`<br>`expect(prismaMock.favorite.findMany).not.toHaveBeenCalled()` | Pasa (24 ms) |
| B-API-095 | Acceso a la lista › Camino 2: firma inválida → 401 Token inválido o expirado | `expect(res.status).toBe(401)`<br>`expect(res.body.error).toBe('Token inválido o expirado')` | Pasa (7 ms) |
| B-API-096 | Acceso a la lista › no hace falta ser administrador: un usuario corriente entra | `expect(res.status).toBe(200)` | Pasa (4 ms) |
| B-API-097 | Camino 3: agregar un celular a favoritos › con un celular que existe → 201 y queda marcado | `expect(res.status).toBe(201)`<br>`expect(res.body.data).toEqual({ phoneId: PHONE_ID, favorited: true })`<br>`expect(prismaMock.favorite.upsert).toHaveBeenCalledWith({` | Pasa (7 ms) |
| B-API-098 | Camino 3: agregar un celular a favoritos › Camino 4: el id de la URL no es un UUID → 400 Datos inválidos | `expect(res.status).toBe(400)`<br>`expect(res.body.error).toBe('Datos inválidos')`<br>`expect(prismaMock.phone.findUnique).not.toHaveBeenCalled()`<br>(+1 aserciones más) | Pasa (3 ms) |
| B-API-099 | Camino 3: agregar un celular a favoritos › Camino 5: UUID bien formado pero que no existe → 404 Celular no encontrado | `expect(res.status).toBe(404)`<br>`expect(res.body.error).toBe('Celular no encontrado')`<br>`expect(prismaMock.favorite.upsert).not.toHaveBeenCalled()` | Pasa (3 ms) |
| B-API-100 | Camino 3: agregar un celular a favoritos › Camino 6: marcarlo dos veces no lo duplica (upsert, no create) | `expect(segunda.status).toBe(201)`<br>`expect(prismaMock.favorite.upsert).toHaveBeenCalledTimes(2)`<br>`expect(prismaMock.favorite.create).not.toHaveBeenCalled()` | Pasa (10 ms) |
| B-API-101 | Camino 7 y 8: quitar de favoritos › quitar uno que estaba marcado → 204 sin cuerpo | `expect(res.status).toBe(204)`<br>`expect(res.body).toEqual({})`<br>`expect(prismaMock.favorite.deleteMany).toHaveBeenCalledWith({` | Pasa (3 ms) |
| B-API-102 | Camino 7 y 8: quitar de favoritos › quitar algo que nunca estuvo marcado → 204 igual, no es un error | `expect(res.status).toBe(204)` | Pasa (2 ms) |
| B-API-103 | Camino 7 y 8: quitar de favoritos › el id de la URL también se valida al quitar → 400 | `expect(res.status).toBe(400)`<br>`expect(prismaMock.favorite.deleteMany).not.toHaveBeenCalled()` | Pasa (3 ms) |
| B-API-104 | Camino 9: consultar la lista › sin favoritos → 200 con lista vacía | `expect(res.status).toBe(200)`<br>`expect(res.body.data).toEqual([])` | Pasa (2 ms) |
| B-API-105 | Camino 9: consultar la lista › devuelve el celular completo, con la misma forma que el catálogo | `expect(res.status).toBe(200)`<br>`expect(res.body.data).toHaveLength(1)`<br>`expect(res.body.data[0]).toMatchObject({` | Pasa (5 ms) |
| B-API-106 | Camino 9: consultar la lista › solo consulta los del usuario del token, nunca los de otro | `expect(prismaMock.favorite.findMany).toHaveBeenCalledWith(` | Pasa (4 ms) |
| B-API-107 | Camino 9: consultar la lista › las características vuelven como texto plano, no como filas | `expect(res.body.data[0].features).toEqual([` | Pasa (3 ms) |
| B-API-108 | Fallos de infraestructura › si la consulta de la lista se cae → 500 | `expect(res.status).toBe(500)` | Pasa (11 ms) |
| B-API-109 | Fallos de infraestructura › si falla la escritura del favorito → 500 | `expect(res.status).toBe(500)` | Pasa (4 ms) |
| B-API-110 | Fallos de infraestructura › si falla el borrado → 500 | `expect(res.status).toBe(500)` | Pasa (3 ms) |

### `tests/escenarios/gestion-perfil.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-API-111 | PATCH /auth/me — editar el nombre › sin token → 401 | `expect(res.status).toBe(401)`<br>`expect(prismaMock.user.update).not.toHaveBeenCalled()` | Pasa (32 ms) |
| B-API-112 | PATCH /auth/me — editar el nombre › nombre válido → 200 con el perfil actualizado y sin contraseña | `expect(res.status).toBe(200)`<br>`expect(res.body.data).toMatchObject({ id: user.id, name: 'Ana María' })`<br>`expect(res.body.data).not.toHaveProperty('password')`<br>(+1 aserciones más) | Pasa (13 ms) |
| B-API-113 | PATCH /auth/me — editar el nombre › nombre demasiado corto → 400 con el campo y el mensaje | `expect(res.status).toBe(400)`<br>`expect(res.body.errors).toEqual([` | Pasa (4 ms) |
| B-API-114 | PATCH /auth/me — editar el nombre › un body con role: ADMIN no cambia el rol | `expect(prismaMock.user.update.mock.calls[0][0].data).toEqual({ name: 'Ana' })` | Pasa (3 ms) |
| B-API-115 | PATCH /auth/me — editar el nombre › el usuario se elimina entre la autenticación y la escritura → 404 | `expect(res.status).toBe(404)`<br>`expect(res.body.error).toBe('Usuario no encontrado')` | Pasa (4 ms) |
| B-API-116 | PATCH /auth/me — editar el nombre › cuenta suspendida → 403, no puede editar su perfil | `expect(res.status).toBe(403)`<br>`expect(prismaMock.user.update).not.toHaveBeenCalled()` | Pasa (9 ms) |
| B-API-117 | PUT /auth/me/password — cambiar la contraseña › contraseña actual correcta y nueva válida → 204 | `expect(res.status).toBe(204)`<br>`expect(prismaMock.user.update.mock.calls[0][0].data).toEqual({` | Pasa (4 ms) |
| B-API-118 | PUT /auth/me/password — cambiar la contraseña › contraseña actual incorrecta → 400 (la sesión sigue abierta) | `expect(res.status).toBe(400)`<br>`expect(res.body.error).toBe('La contraseña actual no es correcta')`<br>`expect(prismaMock.user.update).not.toHaveBeenCalled()` | Pasa (3 ms) |
| B-API-119 | PUT /auth/me/password — cambiar la contraseña › contraseña nueva débil → 400 con la regla incumplida | `expect(res.status).toBe(400)`<br>`expect(res.body.errors).toEqual([` | Pasa (3 ms) |
| B-API-120 | PUT /auth/me/password — cambiar la contraseña › después del cambio, la contraseña vieja ya no sirve para ingresar | `expect(vieja.status).toBe(401)`<br>`expect(nueva.status).toBe(200)` | Pasa (5 ms) |
| B-API-121 | PUT /auth/me/password — cambiar la contraseña › token de un usuario eliminado → 401 | `expect(res.status).toBe(401)` | Pasa (3 ms) |

### `tests/escenarios/pedidos.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-API-122 | POST /orders — crear pedido › sin token → 401 | `expect(res.status).toBe(401)` | Pasa (32 ms) |
| B-API-123 | POST /orders — crear pedido › body inválido → 400 Datos inválidos | `expect(res.status).toBe(400)`<br>`expect(res.body.error).toBe('Datos inválidos')` | Pasa (11 ms) |
| B-API-124 | POST /orders — crear pedido › celular inexistente → 404 | `expect(res.status).toBe(404)` | Pasa (5 ms) |
| B-API-125 | POST /orders — crear pedido › datos correctos → 201 con el pedido creado | `expect(res.status).toBe(201)`<br>`expect(res.body.data.orderRef).toBe('CP-ABC123')` | Pasa (4 ms) |
| B-API-126 | GET /orders/my — mis pedidos › sin token → 401 | `expect(res.status).toBe(401)` | Pasa (3 ms) |
| B-API-127 | GET /orders/my — mis pedidos › con token → 200 con los pedidos de ese usuario | `expect(res.status).toBe(200)`<br>`expect(res.body.data).toHaveLength(1)` | Pasa (10 ms) |
| B-API-128 | GET /orders — listado de admin › rol USER → 403 | `expect(res.status).toBe(403)` | Pasa (3 ms) |
| B-API-129 | GET /orders — listado de admin › admin → 200 con la lista paginada | `expect(res.status).toBe(200)`<br>`expect(res.body.meta).toMatchObject({ total: 1, page: 1, limit: 10 })` | Pasa (6 ms) |
| B-API-130 | PUT /orders/:id/status — cambiar estado › rol USER → 403 | `expect(res.status).toBe(403)` | Pasa (3 ms) |
| B-API-131 | PUT /orders/:id/status — cambiar estado › estado inválido → 400 Datos inválidos | `expect(res.status).toBe(400)` | Pasa (3 ms) |
| B-API-132 | PUT /orders/:id/status — cambiar estado › pedido inexistente → 404 | `expect(res.status).toBe(404)` | Pasa (3 ms) |
| B-API-133 | PUT /orders/:id/status — cambiar estado › transición válida → 200 con el estado nuevo | `expect(res.status).toBe(200)`<br>`expect(res.body.data.status).toBe('SHIPPED')` | Pasa (3 ms) |

### `tests/escenarios/ramas-de-error.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-API-134 | Cambio de rol — PUT /admin/users/:id/role › rol USER → 403 | `expect(res.status).toBe(403)` | Pasa (36 ms) |
| B-API-135 | Cambio de rol — PUT /admin/users/:id/role › rol inválido → 400 Datos inválidos | `expect(res.status).toBe(400)`<br>`expect(res.body.error).toBe('Datos inválidos')` | Pasa (7 ms) |
| B-API-136 | Cambio de rol — PUT /admin/users/:id/role › un admin no puede cambiar su propio rol → 400 | `expect(res.status).toBe(400)`<br>`expect(res.body.error).toBe('No puedes cambiar tu propio rol')`<br>`expect(prismaMock.user.update).not.toHaveBeenCalled()` | Pasa (4 ms) |
| B-API-137 | Cambio de rol — PUT /admin/users/:id/role › cambia el rol de otro usuario → 200 | `expect(res.status).toBe(200)`<br>`expect(res.body.data.role).toBe('ADMIN')` | Pasa (3 ms) |
| B-API-138 | Cambio de rol — PUT /admin/users/:id/role › el id no existe → 404 | `expect(res.status).toBe(404)` | Pasa (3 ms) |
| B-API-139 | Fallos inesperados de la capa de datos › un error de base de datos sale como 500, sin filtrar la consulta | `expect(res.status).toBe(500)`<br>`expect(res.body.error).toBe('Error interno del servidor')` | Pasa (17 ms) |
| B-API-140 | Fallos inesperados de la capa de datos › si la base falla al releer el usuario del token, responde 500 y no 401 | `expect(res.status).toBe(500)` | Pasa (4 ms) |
| B-API-141 | Fallos inesperados de la capa de datos › un update que falla por otra razón distinta de P2025 no se convierte en 404 | `expect(res.status).toBe(500)` | Pasa (4 ms) |
| B-API-142 | Actualización de celular con relaciones › reemplaza imágenes, colores y características cuando vienen en el body | `expect(res.status).toBe(200)`<br>`expect(dataEnviada.images).toMatchObject({ deleteMany: {} })`<br>`expect(dataEnviada.colors).toMatchObject({ deleteMany: {} })`<br>(+1 aserciones más) | Pasa (6 ms) |
| B-API-143 | Actualización de celular con relaciones › sin relaciones en el body, no las toca | `expect(dataEnviada).not.toHaveProperty('images')`<br>`expect(dataEnviada).not.toHaveProperty('colors')`<br>`expect(dataEnviada).not.toHaveProperty('features')` | Pasa (4 ms) |
| B-API-144 | Panel — pedidos recientes › mapea los pedidos recientes con su número de artículos | `expect(res.status).toBe(200)`<br>`expect(res.body.data.recentOrders[0]).toMatchObject({` | Pasa (19 ms) |

### `tests/escenarios/ramas-restantes.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-API-145 | Fallos al consultar listados › si falla la consulta de mis pedidos → 500 | `expect(res.status).toBe(500)` | Pasa (38 ms) |
| B-API-146 | Fallos al consultar listados › si falla el conteo del catálogo → 500 | `expect(res.status).toBe(500)` | Pasa (6 ms) |
| B-API-147 | Fallos al consultar listados › si falla la consulta del listado de usuarios → 500 | `expect(res.status).toBe(500)` | Pasa (4 ms) |
| B-API-148 | Fallos al consultar listados › si falla la lectura del perfil después de validar el token → 500 | `expect(res.status).toBe(500)` | Pasa (10 ms) |
| B-API-149 | Fallos al consultar listados › si el usuario desaparece entre validar el token y leer el perfil → 404 | `expect(res.status).toBe(404)`<br>`expect(res.body.error).toBe('Usuario no encontrado')` | Pasa (4 ms) |
| B-API-150 | En producción no se filtra el detalle del error › la respuesta 500 no expone el mensaje interno | `expect(res.status).toBe(500)`<br>`expect(res.body.error).toBe('Error interno del servidor')`<br>`expect(res.body).not.toHaveProperty('detail')` | Pasa (5 ms) |
| B-API-151 | En producción no se filtra el detalle del error › fuera de producción sí incluye el detalle, para diagnosticar | `expect(res.status).toBe(500)`<br>`expect(res.body.detail).toBe('fallo de prueba')` | Pasa (3 ms) |
| B-API-152 | Estados terminales de un pedido › un pedido entregado no admite más cambios | `expect(res.status).toBe(400)`<br>`expect(res.body.error).toContain('estado final')`<br>`expect(prismaMock.order.update).not.toHaveBeenCalled()` | Pasa (13 ms) |
| B-API-153 | Estados terminales de un pedido › si falla la escritura del nuevo estado → 500 | `expect(res.status).toBe(500)` | Pasa (4 ms) |
| B-API-154 | Estados terminales de un pedido › un pedido cancelado tampoco revive | `expect(res.status).toBe(400)`<br>`expect(res.body.error).toContain('estado final')` | Pasa (3 ms) |
| B-API-155 | Mensaje de cuenta suspendida › sin motivo registrado, el mensaje no inventa uno | `expect(res.status).toBe(403)`<br>`expect(res.body.error).toBe('Tu cuenta ha sido suspendida.')`<br>`expect(res.body.error).not.toContain('Motivo')` | Pasa (4 ms) |
| B-API-156 | Mensaje de cuenta suspendida › el middleware tampoco inventa motivo cuando no lo hay | `expect(res.status).toBe(403)`<br>`expect(res.body.error).toBe('Tu cuenta ha sido suspendida.')` | Pasa (4 ms) |
| B-API-157 | Un celular con todas sus relaciones › al crearlo, se guardan las relaciones y vuelven ya mapeadas | `expect(res.status).toBe(201)`<br>`expect(res.body.data.images[0]).toMatchObject({`<br>`expect(res.body.data.colors[0]).toMatchObject({`<br>(+1 aserciones más) | Pasa (6 ms) |
| B-API-158 | Un celular con todas sus relaciones › al editarlo, las relaciones se reemplazan por completo | `expect(res.status).toBe(200)`<br>`expect(args.data.images.deleteMany).toEqual({})`<br>`expect(args.data.colors.deleteMany).toEqual({})`<br>(+1 aserciones más) | Pasa (4 ms) |
| B-API-159 | Filas incompletas que llegan del motor › si el usuario viene sin el conteo de pedidos, el panel muestra 0 | `expect(res.status).toBe(200)`<br>`expect(res.body.data.orderCount).toBe(0)` | Pasa (3 ms) |
| B-API-160 | Filas incompletas que llegan del motor › un groupBy sin sumas (todas en null) no rompe los ingresos | `expect(res.status).toBe(200)`<br>`expect(res.body.data.orders).toMatchObject({` | Pasa (20 ms) |
| B-API-161 | CORS › sin FRONTEND_URL configurado, acepta cualquier origen | `expect(res.headers['access-control-allow-origin']).toBe('*')` | Pasa (72 ms) |
| B-API-162 | CORS › con FRONTEND_URL configurado, responde con ese origen | `expect(res.headers['access-control-allow-origin']).toBe(` | Pasa (36 ms) |

## Aserciones fluidas

### `tests/fluent/asserciones-fluidas.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-FLU-001 | Recomendación de productos — aserciones fluidas (func. 13) › puntúa 6 cuando coinciden marca, categoría y precio | `expect(puntaje, 'afinidad cuando coinciden marca+categoría+precio').to.equal(` | Pasa (23 ms) |
| B-FLU-002 | Recomendación de productos — aserciones fluidas (func. 13) › no otorga puntos por marca cuando difiere, aunque cambien las mayúsculas del resto | `expect(puntaje, 'afinidad sin coincidencia de marca').to.equal(` | Pasa (1 ms) |
| B-FLU-003 | Recomendación de productos — aserciones fluidas (func. 13) › devuelve 0 cuando no comparte ningún criterio | `expect(afinidad(iphone15, sinNada), 'afinidad sin nada en común').to.equal(0)` | Pasa (0 ms) |
| B-FLU-004 | Recomendación de productos — aserciones fluidas (func. 13) › calcula el rango de precio equivalente con el margen configurado | `expect(rango, 'rango de precio al 25% sobre 1.000.000')` | Pasa (1 ms) |
| B-FLU-005 | Recomendación de productos — aserciones fluidas (func. 13) › ordena por afinidad y desempata por cercanía de precio | `expect(orden.map((c) => c.id), 'orden por afinidad con desempate por precio')` | Pasa (1 ms) |
| B-FLU-006 | Recomendación de productos — aserciones fluidas (func. 13) › recorta al límite pedido aunque haya más candidatos | `expect(orden, 'recomendaciones recortadas al límite').to.have.lengthOf(2)` | Pasa (1 ms) |
| B-FLU-007 | Alertas de stock bajo — aserciones fluidas (func. 14) › el umbral es inclusivo: stock igual al mínimo ya dispara LOW_STOCK | `expect(evaluarAlerta(5, 5), 'stock == minStock').to.equal('LOW_STOCK')` | Pasa (0 ms) |
| B-FLU-008 | Alertas de stock bajo — aserciones fluidas (func. 14) › no hay alerta con stock por encima del mínimo | `expect(evaluarAlerta(6, 5), 'stock > minStock').to.be.null` | Pasa (0 ms) |
| B-FLU-009 | Alertas de stock bajo — aserciones fluidas (func. 14) › OUT_OF_STOCK tiene prioridad sobre LOW_STOCK cuando el stock es 0 o negativo | `expect(evaluarAlerta(0, 5), 'stock en 0').to.equal('OUT_OF_STOCK')`<br>`expect(evaluarAlerta(-1, 5), 'stock negativo, dato inconsistente pero no debe explotar')` | Pasa (0 ms) |
| B-FLU-010 | Alertas de stock bajo — aserciones fluidas (func. 14) › el mensaje de stock bajo usa singular cuando queda exactamente una unidad | `expect(mensajeAlerta('LOW_STOCK', 'iPhone 13', 1, 5), 'mensaje con 1 unidad')` | Pasa (1 ms) |
| B-FLU-011 | Alertas de stock bajo — aserciones fluidas (func. 14) › el mensaje de sin stock no menciona la cantidad | `expect(mensajeAlerta('OUT_OF_STOCK', 'Galaxy S24', 0, 5), 'mensaje sin stock')` | Pasa (1 ms) |
| B-FLU-012 | AppError — excepciones fluidas › conserva el statusCode y el mensaje con los que se crea | `expect(construir, 'guarda de auto-protección de changeUserRole')` | Pasa (1 ms) |

### `tests/fluent/credenciales-y-perfil.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-FLU-013 | Validación de credenciales — fluido › la lista de dominios permitidos es exactamente la acordada con el frontend | `expect([...DOMINIOS_PERMITIDOS], 'dominios permitidos para registrarse')` | Pasa (4 ms) |
| B-FLU-014 | Validación de credenciales — fluido › normaliza el correo antes de compararlo | `expect(normalizarEmail('  Ana@GMAIL.com '), 'correo normalizado')`<br>`expect(dominioPermitido('ANA@Gmail.Com'), 'dominio con mayúsculas').to.be.true` | Pasa (1 ms) |
| B-FLU-015 | Validación de credenciales — fluido › describe todos los problemas de una contraseña débil | `expect(problemasDePassword('abc'), 'problemas de "abc"')` | Pasa (1 ms) |
| B-FLU-016 | Registro de usuario — fluido › el DTO devuelve los datos ya limpios | `expect(r.success, 'registro válido').to.be.true`<br>`expect(r.data, 'datos del registro')` | Pasa (3 ms) |
| B-FLU-017 | Inicio de sesión — fluido › rechaza con AppError 401 y el mensaje genérico | `expect(error, 'error del login').to.be.an.instanceOf(Error)` | Pasa (1 ms) |
| B-FLU-018 | Inicio de sesión — fluido › entrega un token y el usuario público | `expect(r, 'respuesta del login').to.have.all.keys('user', 'token')`<br>`expect(r.user, 'usuario devuelto').to.not.have.property('password')`<br>`expect(r.token, 'JWT').to.be.a('string').and.match(/^[\w-]+\.[\w-]+\.[\w-]+$/)` | Pasa (4 ms) |
| B-FLU-019 | Gestión de perfil — fluido › updateProfile devuelve el perfil público con el nombre nuevo | `expect(perfil, 'perfil actualizado')` | Pasa (1 ms) |
| B-FLU-020 | Gestión de perfil — fluido › el DTO de perfil ignora todo lo que no sea el nombre | `expect(r.success && r.data, 'body del perfil').to.deep.equal({ name: 'Ana' })` | Pasa (1 ms) |
| B-FLU-021 | Gestión de perfil — fluido › changePassword explica por qué rechaza la contraseña actual | `expect(error, 'error al cambiar la contraseña')` | Pasa (1 ms) |
| B-FLU-022 | Gestión de perfil — fluido › changePasswordDto marca el campo correcto cuando se repite la contraseña | `expect(r.success, 'contraseña repetida').to.be.false`<br>`expect(r.error.errors[0].path, 'campo señalado').to.deep.equal(['newPassword'])` | Pasa (3 ms) |

## Regresión

### `tests/regression/regresion-credenciales.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-REG-001 | Regresión — defectos corregidos › regresion_login_con_mayusculas_en_el_correo_encuentra_la_cuenta | `expect(res.status).toBe(200)` | Pasa (36 ms) |
| B-REG-002 | Regresión — defectos corregidos › regresion_el_backend_aplica_la_lista_de_dominios_del_frontend | `expect(res.status).toBe(400)`<br>`expect(prismaMock.user.create).not.toHaveBeenCalled()` | Pasa (6 ms) |
| B-REG-003 | Regresión — defectos corregidos › regresion_el_backend_exige_la_politica_de_contrasenas | `expect(res.status).toBe(400)` | Pasa (3 ms) |
| B-REG-004 | Regresión — defectos corregidos › regresion_json_malformado_responde_400_y_no_500 | `expect(res.status).toBe(400)` | Pasa (5 ms) |
| B-REG-005 | Regresión — defectos corregidos › regresion_existen_los_endpoints_de_gestion_de_perfil | `expect(perfil.status).toBe(400)`<br>`expect(clave.status).toBe(400)` | Pasa (13 ms) |
| B-REG-006 | Regresión — valores de negocio fijados › regresion_dominios_permitidos_son_cinco | `expect(DOMINIOS_PERMITIDOS).toEqual(['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'])` | Pasa (1 ms) |
| B-REG-007 | Regresión — valores de negocio fijados › regresion_longitud_de_contrasena_entre_8_y_72 | `expect([PASSWORD_MIN, PASSWORD_MAX]).toEqual([8, 72])` | Pasa (0 ms) |
| B-REG-008 | Regresión — valores de negocio fijados › regresion_nombre_minimo_de_2_caracteres | `expect(registerDto.safeParse({ email: 'a@gmail.com', name: 'A', password: 'Password123' }).success).toBe(fa...`<br>`expect(registerDto.safeParse({ email: 'a@gmail.com', name: 'Al', password: 'Password123' }).success).toBe(t...` | Pasa (1 ms) |
| B-REG-009 | Regresión — valores de negocio fijados › regresion_minstock_por_defecto_5_dispara_alerta_con_5_unidades | `expect(evaluarAlerta(5, 5)).toBe('LOW_STOCK')`<br>`expect(evaluarAlerta(6, 5)).toBeNull()` | Pasa (0 ms) |

### `tests/regression/regresion.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-REG-010 | Regresión — recomendación de productos (func. 13) › regresion_afinidad_maxima_es_6_puntos | `expect(puntaje).toBe(6)` | Pasa (4 ms) |
| B-REG-011 | Regresión — recomendación de productos (func. 13) › regresion_margen_de_precio_equivalente_es_25_por_ciento | `expect(min).toBe(150_000)`<br>`expect(max).toBe(250_000)` | Pasa (0 ms) |
| B-REG-012 | Regresión — recomendación de productos (func. 13) › regresion_limite_de_recomendaciones_recorta_la_lista | `expect(resultado).toHaveLength(4)` | Pasa (1 ms) |
| B-REG-013 | Regresión — alertas de stock bajo (func. 14) › regresion_stock_igual_al_minimo_dispara_low_stock | `expect(evaluarAlerta(10, 10)).toBe('LOW_STOCK')` | Pasa (2 ms) |
| B-REG-014 | Regresión — alertas de stock bajo (func. 14) › regresion_stock_en_cero_dispara_out_of_stock_no_low_stock | `expect(evaluarAlerta(0, 10)).toBe('OUT_OF_STOCK')` | Pasa (1 ms) |
| B-REG-015 | Regresión — alertas de stock bajo (func. 14) › regresion_stock_por_encima_del_minimo_no_dispara_alerta | `expect(evaluarAlerta(11, 10)).toBeNull()` | Pasa (0 ms) |
| B-REG-016 | Regresión — crear orden (func. 22) › regresion_envio_gratis_a_partir_de_500_001 | `expect(resultado.shipping).toBe(0)`<br>`expect(resultado.total).toBe(500_001)` | Pasa (2 ms) |
| B-REG-017 | Regresión — crear orden (func. 22) › regresion_envio_tiene_costo_en_el_umbral_exacto_de_500_000 | `expect(resultado.shipping).toBe(20_000)`<br>`expect(resultado.total).toBe(520_000)` | Pasa (1 ms) |
| B-REG-018 | Regresión — actualizar estado de una orden (func. 25) › regresion_pedido_entregado_es_un_estado_terminal | `await expect(`<br>`).rejects.toMatchObject({`<br>`expect(prismaMock.order.update).not.toHaveBeenCalled()` | Pasa (3 ms) |
| B-REG-019 | Regresión — banear / cambiar rol (func. 21, 26) › regresion_mensaje_exacto_al_intentar_banearse_a_si_mismo | `await expect(`<br>`).rejects.toMatchObject({ message: 'No puedes banear tu propia cuenta' })` | Pasa (1 ms) |
| B-REG-020 | Regresión — banear / cambiar rol (func. 21, 26) › regresion_mensaje_exacto_al_intentar_cambiarse_el_rol_a_si_mismo | `await expect(`<br>`).rejects.toMatchObject({ message: 'No puedes cambiar tu propio rol' })` | Pasa (1 ms) |

## Rendimiento (presupuestos)

### `tests/rendimiento/rendimiento.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-REN-001 | Rendimiento — reglas de dominio › evalúa la alerta de 100.000 celulares en menos de 250 ms | `expect(alertas.filter((a) => a === 'OUT_OF_STOCK')).toHaveLength(8334)`<br>`expect(alertas.filter((a) => a === 'LOW_STOCK')).toHaveLength(41_668)`<br>`expect(duracion, `tardó ${duracion.toFixed(1)} ms`).toBeLessThan(250)` | Pasa (38 ms) |
| B-REN-002 | Rendimiento — reglas de dominio › valida 10.000 contraseñas en menos de 250 ms | `expect(problemasDePassword('Clave1x')).toEqual([`<br>`expect(duracion, `tardó ${duracion.toFixed(1)} ms`).toBeLessThan(250)` | Pasa (17 ms) |
| B-REN-003 | Rendimiento — endpoints de las funcionalidades › POST /auth/login: mediana de 15 peticiones bajo 150 ms | `.expect(200),`<br>`expect(t, `mediana ${t.toFixed(1)} ms`).toBeLessThan(150)` | Pasa (108 ms) |
| B-REN-004 | Rendimiento — endpoints de las funcionalidades › GET /admin/alerts con 500 alertas abiertas: mediana bajo 150 ms | `expect(res.body.data).toHaveLength(500)`<br>`expect(t, `mediana ${t.toFixed(1)} ms`).toBeLessThan(150)` | Pasa (81 ms) |

## Seguridad

### `tests/seguridad/fuerza-bruta.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-SEG-001 | Fuerza bruta — límite de intentos fallidos › los primeros 5 intentos fallidos responden 401 y el sexto 429 | `expect(codigos).toEqual([401, 401, 401, 401, 401, 429])` | Pasa (46 ms) |
| B-SEG-002 | Fuerza bruta — límite de intentos fallidos › el 429 explica cuánto esperar e incluye Retry-After | `expect(r.status).toBe(429)`<br>`expect(r.body.error).toMatch(/^Demasiados intentos fallidos\. Intenta de nuevo en 15 minutos\.$/)`<br>`expect(Number(r.headers['retry-after'])).toBeGreaterThan(0)` | Pasa (18 ms) |
| B-SEG-003 | Fuerza bruta — límite de intentos fallidos › bloqueada la cuenta, ni siquiera la contraseña correcta entra hasta que pase la ventana | `expect(r.status).toBe(429)` | Pasa (11 ms) |
| B-SEG-004 | Fuerza bruta — límite de intentos fallidos › un login correcto antes del límite borra los fallos acumulados | `await request(app).post(LOGIN).send({ email: 'ana@gmail.com', password: 'Correcta123' }).expect(200)`<br>`expect(await fallar(5)).toEqual([401, 401, 401, 401, 401])` | Pasa (24 ms) |
| B-SEG-005 | Fuerza bruta — límite de intentos fallidos › la cuenta bloqueada no afecta a otra cuenta | `expect(codigo).toBe(401)` | Pasa (10 ms) |
| B-SEG-006 | Fuerza bruta — límite de intentos fallidos › el correo con mayúsculas cuenta como la misma cuenta | `expect(codigo).toBe(429)` | Pasa (12 ms) |
| B-SEG-007 | Fuerza bruta — límite de intentos fallidos › pasada la ventana de 15 minutos, la cuenta vuelve a poder intentar | `expect(r.status).toBe(200)` | Pasa (13 ms) |
| B-SEG-008 | Fuerza bruta — límite de intentos fallidos › más de 50 fallos desde una IP sobre cuentas distintas también se bloquean | `expect(codigo).toBe(429)` | Pasa (135 ms) |
| B-SEG-009 | Fuerza bruta — IP detrás de un proxy › por defecto no confía en X-Forwarded-For (no se puede falsificar la IP) | `expect(app.get('trust proxy')).toBe(false)` | Pasa (2 ms) |
| B-SEG-010 | Fuerza bruta — IP detrás de un proxy › con TRUST_PROXY=true toma la IP del primer proxy | `expect(appConProxy.get('trust proxy')).toBe(1)` | Pasa (28 ms) |

### `tests/seguridad/seguridad-credenciales.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-SEG-011 | Registro — asignación masiva › un body con role: ADMIN crea igualmente un USER | `expect(res.status).toBe(201)`<br>`expect(prismaMock.user.create.mock.calls[0][0].data).not.toHaveProperty('role')`<br>`expect(res.body.data.user.role).toBe('USER')` | Pasa (38 ms) |
| B-SEG-012 | Registro — asignación masiva › la contraseña se guarda hasheada | `expect(prismaMock.user.create.mock.calls[0][0].data.password).toBe('hash:Password123')` | Pasa (5 ms) |
| B-SEG-013 | Ninguna respuesta expone la contraseña › registro | `expect(res.status).toBeLessThan(300)`<br>`expect(JSON.stringify(res.body)).not.toContain('hash:Password123')`<br>`expect(JSON.stringify(res.body)).not.toContain('"password"')` | Pasa (4 ms) |
| B-SEG-014 | Ninguna respuesta expone la contraseña › login | `expect(res.status).toBeLessThan(300)`<br>`expect(JSON.stringify(res.body)).not.toContain('hash:Password123')`<br>`expect(JSON.stringify(res.body)).not.toContain('"password"')` | Pasa (4 ms) |
| B-SEG-015 | Ninguna respuesta expone la contraseña › perfil | `expect(res.status).toBeLessThan(300)`<br>`expect(JSON.stringify(res.body)).not.toContain('hash:Password123')`<br>`expect(JSON.stringify(res.body)).not.toContain('"password"')` | Pasa (4 ms) |
| B-SEG-016 | Control de roles — el rol se lee de la base, no del token › un token que dice ADMIN de un usuario que hoy es USER → 403 en /admin | `expect(res.status).toBeLessThan(300)`<br>`expect(JSON.stringify(res.body)).not.toContain('hash:Password123')`<br>`expect(JSON.stringify(res.body)).not.toContain('"password"')` | Pasa (9 ms) |
| B-SEG-017 | Control de roles — el rol se lee de la base, no del token › un USER no accede a GET /api/v1/admin/stats | `expect(res.status).toBeLessThan(300)`<br>`expect(JSON.stringify(res.body)).not.toContain('hash:Password123')`<br>`expect(JSON.stringify(res.body)).not.toContain('"password"')` | Pasa (3 ms) |
| B-SEG-018 | Control de roles — el rol se lee de la base, no del token › un USER no accede a GET /api/v1/admin/users | `expect(res.status).toBeLessThan(300)`<br>`expect(JSON.stringify(res.body)).not.toContain('hash:Password123')`<br>`expect(JSON.stringify(res.body)).not.toContain('"password"')` | Pasa (3 ms) |
| B-SEG-019 | Control de roles — el rol se lee de la base, no del token › un USER no accede a GET /api/v1/admin/alerts | `expect(res.status).toBeLessThan(300)`<br>`expect(JSON.stringify(res.body)).not.toContain('hash:Password123')`<br>`expect(JSON.stringify(res.body)).not.toContain('"password"')` | Pasa (3 ms) |
| B-SEG-020 | Control de roles — el rol se lee de la base, no del token › un USER no accede a PUT /api/v1/admin/users/x/role | `expect(res.status).toBeLessThan(300)`<br>`expect(JSON.stringify(res.body)).not.toContain('hash:Password123')`<br>`expect(JSON.stringify(res.body)).not.toContain('"password"')` | Pasa (2 ms) |
| B-SEG-021 | Control de roles — el rol se lee de la base, no del token › un USER no accede a PUT /api/v1/admin/users/x/ban | `expect(res.status).toBeLessThan(300)`<br>`expect(JSON.stringify(res.body)).not.toContain('hash:Password123')`<br>`expect(JSON.stringify(res.body)).not.toContain('"password"')` | Pasa (2 ms) |
| B-SEG-022 | Control de roles — el rol se lee de la base, no del token › un token con algoritmo "none" (sin firma) se rechaza | `expect(res.status).toBeLessThan(300)`<br>`expect(JSON.stringify(res.body)).not.toContain('hash:Password123')`<br>`expect(JSON.stringify(res.body)).not.toContain('"password"')` | Pasa (2 ms) |
| B-SEG-023 | Control de roles — el rol se lee de la base, no del token › un admin no puede quitarse a sí mismo el rol | `expect(res.status).toBeLessThan(300)`<br>`expect(JSON.stringify(res.body)).not.toContain('hash:Password123')`<br>`expect(JSON.stringify(res.body)).not.toContain('"password"')` | Pasa (4 ms) |
| B-SEG-024 | Cabeceras y errores › no anuncia el framework (X-Powered-By) | `expect(res.status).toBeLessThan(300)`<br>`expect(JSON.stringify(res.body)).not.toContain('hash:Password123')`<br>`expect(JSON.stringify(res.body)).not.toContain('"password"')` | Pasa (2 ms) |
| B-SEG-025 | Cabeceras y errores › un body JSON malformado en el login no devuelve 500 | `expect(res.status).toBeLessThan(300)`<br>`expect(JSON.stringify(res.body)).not.toContain('hash:Password123')`<br>`expect(JSON.stringify(res.body)).not.toContain('"password"')` | Pasa (5 ms) |
| B-SEG-026 | Errores del cliente al enviar el cuerpo › JSON malformado → 400 con un mensaje claro y sin detalle interno | `expect(res.status).toBeLessThan(300)`<br>`expect(JSON.stringify(res.body)).not.toContain('hash:Password123')`<br>`expect(JSON.stringify(res.body)).not.toContain('"password"')` | Pasa (3 ms) |
| B-SEG-027 | Errores del cliente al enviar el cuerpo › un cuerpo de más de 100 kB → 413, no 500 | `expect(res.status).toBeLessThan(300)`<br>`expect(JSON.stringify(res.body)).not.toContain('hash:Password123')`<br>`expect(JSON.stringify(res.body)).not.toContain('"password"')` | Pasa (5 ms) |

## Unitaria

### `tests/unit/alertas/stock-alerts.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-001 | evaluarAlerta — qué alerta corresponde a un inventario › sin unidades → OUT_OF_STOCK | `expect(evaluarAlerta(0, 5)).toBe('OUT_OF_STOCK')` | Pasa (4 ms) |
| B-UNI-002 | evaluarAlerta — qué alerta corresponde a un inventario › stock negativo (dato corrupto) también cuenta como agotado | `expect(evaluarAlerta(-2, 5)).toBe('OUT_OF_STOCK')` | Pasa (0 ms) |
| B-UNI-003 | evaluarAlerta — qué alerta corresponde a un inventario › justo en el mínimo → LOW_STOCK (el umbral es inclusivo) | `expect(evaluarAlerta(5, 5)).toBe('LOW_STOCK')` | Pasa (0 ms) |
| B-UNI-004 | evaluarAlerta — qué alerta corresponde a un inventario › por debajo del mínimo → LOW_STOCK | `expect(evaluarAlerta(1, 5)).toBe('LOW_STOCK')` | Pasa (0 ms) |
| B-UNI-005 | evaluarAlerta — qué alerta corresponde a un inventario › por encima del mínimo → ninguna alerta | `expect(evaluarAlerta(6, 5)).toBeNull()` | Pasa (0 ms) |
| B-UNI-006 | evaluarAlerta — qué alerta corresponde a un inventario › con mínimo en 0, una sola unidad ya es inventario sano | `expect(evaluarAlerta(1, 0)).toBeNull()` | Pasa (0 ms) |
| B-UNI-007 | evaluarAlerta — qué alerta corresponde a un inventario › con mínimo en 0, quedarse en cero sigue siendo agotado | `expect(evaluarAlerta(0, 0)).toBe('OUT_OF_STOCK')` | Pasa (0 ms) |
| B-UNI-008 | mensajeAlerta — texto que ve el administrador › agotado: avisa que no quedan unidades | `expect(mensajeAlerta('OUT_OF_STOCK', 'iPhone 13', 0, 5)).toBe(` | Pasa (0 ms) |
| B-UNI-009 | mensajeAlerta — texto que ve el administrador › poco stock: incluye cuántas quedan y cuál es el mínimo | `expect(mensajeAlerta('LOW_STOCK', 'iPhone 13', 3, 5)).toBe(` | Pasa (0 ms) |
| B-UNI-010 | mensajeAlerta — texto que ve el administrador › concuerda el singular cuando queda una sola unidad | `expect(mensajeAlerta('LOW_STOCK', 'Xiaomi 13', 1, 5)).toBe(` | Pasa (0 ms) |
| B-UNI-011 | sincronizarAlertas — deja la tabla Alert al día › inventario sano: cierra lo que hubiera abierto y no abre nada | `expect(prismaMock.alert.updateMany).toHaveBeenCalledWith({`<br>`expect(prismaMock.alert.upsert).not.toHaveBeenCalled()` | Pasa (5 ms) |
| B-UNI-012 | sincronizarAlertas — deja la tabla Alert al día › poco stock: cierra las de otro tipo y abre (o reabre) la de LOW_STOCK | `expect(prismaMock.alert.updateMany).toHaveBeenCalledWith({`<br>`expect(prismaMock.alert.upsert).toHaveBeenCalledWith(` | Pasa (3 ms) |
| B-UNI-013 | sincronizarAlertas — deja la tabla Alert al día › agotado: abre la de OUT_OF_STOCK y cierra la de poco stock | `expect(prismaMock.alert.updateMany).toHaveBeenCalledWith({`<br>`expect(args.create.message).toContain('sin unidades')` | Pasa (1 ms) |
| B-UNI-014 | sincronizarAlertas — deja la tabla Alert al día › el mensaje que se guarda es el que produce la regla de dominio | `expect(args.create.message).toBe(` | Pasa (0 ms) |

### `tests/unit/catalogo/phones.use-cases.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-015 | getPhoneBySlug — obtener un celular por su slug › returns the phone when the slug exists | `expect(result).toEqual(telefonos[0]);` | Pasa (69 ms) |
| B-UNI-016 | getPhoneBySlug — obtener un celular por su slug › asks the repository for the exact slug | `expect(spy).toHaveBeenCalledTimes(1);`<br>`expect(spy).toHaveBeenCalledWith('iphone-15');` | Pasa (2 ms) |
| B-UNI-017 | getPhoneBySlug — obtener un celular por su slug › throws a 404 AppError when the slug does not exist | `await expect(getPhoneBySlug(repo, 'galaxy-s24')).rejects.toMatchObject({` | Pasa (2 ms) |
| B-UNI-018 | getPhoneBySlug — obtener un celular por su slug › throws 404 when the repository has no phones at all | `await expect(getPhoneBySlug(repo, 'cualquier-slug')).rejects.toMatchObject({` | Pasa (1 ms) |
| B-UNI-019 | getPhoneBySlug — obtener un celular por su slug › matches the slug exactly and not by partial text | `await expect(getPhoneBySlug(repo, 'iphone-1')).rejects.toMatchObject({` | Pasa (0 ms) |
| B-UNI-020 | getPhones — listar celulares con filtros y paginación › delegates the filters and pagination to the repository | `expect(spy).toHaveBeenCalledTimes(1);`<br>`expect(spy).toHaveBeenCalledWith(`<br>`expect(result).toEqual(pagina);` | Pasa (2 ms) |
| B-UNI-021 | getPhones — listar celulares con filtros y paginación › applies the filters to the in-memory phones | `expect(result.data).toHaveLength(1);`<br>`expect(result.data[0].slug).toBe('galaxy-s24');`<br>`expect(result.meta.total).toBe(1);` | Pasa (1 ms) |
| B-UNI-022 | getPhoneById — obtener un celular por su id › returns the phone when the id exists | `expect(result).toEqual(telefonos[1]);` | Pasa (1 ms) |
| B-UNI-023 | getPhoneById — obtener un celular por su id › throws a 404 AppError when the id does not exist | `await expect(getPhoneById(repo, 'id-desconocido')).rejects.toMatchObject({` | Pasa (1 ms) |
| B-UNI-024 | createPhone — crear un celular › creates a phone keeping every optional field provided | `expect(result).toMatchObject({`<br>`await expect(repo.findById(result.id)).resolves.toMatchObject({` | Pasa (1 ms) |
| B-UNI-025 | createPhone — crear un celular › defaults the optional fields to null when they are absent | `expect(result).toMatchObject({` | Pasa (1 ms) |
| B-UNI-026 | updatePhone — actualizar un celular › updates an existing phone with the given data | `expect(spy).toHaveBeenCalledTimes(1);`<br>`expect(spy).toHaveBeenCalledWith('p1', data);`<br>`expect(result.price).toBe(2_000_000);`<br>(+1 aserciones más) | Pasa (1 ms) |
| B-UNI-027 | updatePhone — actualizar un celular › throws a 404 AppError when the phone does not exist | `await expect(`<br>`).rejects.toMatchObject({` | Pasa (1 ms) |
| B-UNI-028 | deletePhone — eliminar un celular › deletes an existing phone | `expect(spy).toHaveBeenCalledTimes(1);`<br>`expect(spy).toHaveBeenCalledWith('p1');`<br>`await expect(repo.findById('p1')).resolves.toBeNull();` | Pasa (1 ms) |
| B-UNI-029 | deletePhone — eliminar un celular › throws a 404 AppError when the phone does not exist | `await expect(`<br>`).rejects.toMatchObject({` | Pasa (1 ms) |

### `tests/unit/catalogo/recomendaciones.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-030 | rangoDePrecio › abre una ventana del ±25% alrededor del precio | `expect(rangoDePrecio(1_000_000)).toEqual({ min: 750_000, max: 1_250_000 })` | Pasa (7 ms) |
| B-UNI-031 | rangoDePrecio › devuelve enteros, porque la columna price lo es | `expect(Number.isInteger(min)).toBe(true)`<br>`expect(Number.isInteger(max)).toBe(true)` | Pasa (1 ms) |
| B-UNI-032 | rangoDePrecio › el margen es el declarado en el dominio, no un número suelto | `expect(min).toBe(precio * (1 - MARGEN_PRECIO))`<br>`expect(max).toBe(precio * (1 + MARGEN_PRECIO))` | Pasa (0 ms) |
| B-UNI-033 | afinidad — cuántos puntos gana un candidato › coincidir en todo da el máximo | `expect(afinidad(BASE, comparable())).toBe(` | Pasa (0 ms) |
| B-UNI-034 | afinidad — cuántos puntos gana un candidato › no coincidir en nada da cero | `expect(afinidad(BASE, ajeno)).toBe(0)` | Pasa (0 ms) |
| B-UNI-035 | afinidad — cuántos puntos gana un candidato › la marca pesa más que la categoría, y la categoría más que el precio | `expect(afinidad(BASE, soloMarca)).toBe(PESO_MARCA)`<br>`expect(afinidad(BASE, soloCategoria)).toBe(PESO_CATEGORIA)`<br>`expect(afinidad(BASE, soloPrecio)).toBe(PESO_PRECIO)`<br>(+2 aserciones más) | Pasa (1 ms) |
| B-UNI-036 | afinidad — cuántos puntos gana un candidato › la marca se compara sin distinguir mayúsculas | `expect(afinidad(BASE, comparable({ brand: 'APPLE' }))).toBe(` | Pasa (0 ms) |
| B-UNI-037 | afinidad — cuántos puntos gana un candidato › bordes del rango de precio › el mínimo exacto cuenta como dentro | `expect(afinidad(BASE, { ...fuera, price: min })).toBe(PESO_PRECIO)` | Pasa (0 ms) |
| B-UNI-038 | afinidad — cuántos puntos gana un candidato › bordes del rango de precio › un peso por debajo del mínimo ya no | `expect(afinidad(BASE, { ...fuera, price: min - 1 })).toBe(0)` | Pasa (0 ms) |
| B-UNI-039 | afinidad — cuántos puntos gana un candidato › bordes del rango de precio › el máximo exacto cuenta como dentro | `expect(afinidad(BASE, { ...fuera, price: max })).toBe(PESO_PRECIO)` | Pasa (3 ms) |
| B-UNI-040 | afinidad — cuántos puntos gana un candidato › bordes del rango de precio › un peso por encima del máximo ya no | `expect(afinidad(BASE, { ...fuera, price: max + 1 })).toBe(0)` | Pasa (0 ms) |
| B-UNI-041 | ordenarPorAfinidad › sin candidatos devuelve una lista vacía | `expect(ordenarPorAfinidad(BASE, [], 4)).toEqual([])` | Pasa (0 ms) |
| B-UNI-042 | ordenarPorAfinidad › ordena de más afín a menos | `expect(ordenarPorAfinidad(BASE, candidatos, 3).map((c) => c.id)).toEqual([` | Pasa (0 ms) |
| B-UNI-043 | ordenarPorAfinidad › a igual afinidad gana el de precio más cercano | `expect(ordenarPorAfinidad(BASE, candidatos, 2).map((c) => c.id)).toEqual([` | Pasa (0 ms) |
| B-UNI-044 | ordenarPorAfinidad › recorta al límite pedido | `expect(ordenarPorAfinidad(BASE, candidatos, 1)).toHaveLength(1)` | Pasa (1 ms) |
| B-UNI-045 | ordenarPorAfinidad › no modifica el arreglo que recibe | `expect(candidatos).toEqual(copia)` | Pasa (0 ms) |

### `tests/unit/control-roles/admin.use-cases.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-046 | changeUserRole › promueve a un USER a ADMIN | `expect(prismaMock.user.update).toHaveBeenCalledWith(`<br>`expect(result.role).toBe('ADMIN')` | Pasa (8 ms) |
| B-UNI-047 | changeUserRole › rechaza que un admin cambie su propio rol | `await expect(`<br>`).rejects.toMatchObject({ statusCode: 400 })`<br>`expect(prismaMock.user.update).not.toHaveBeenCalled()` | Pasa (2 ms) |
| B-UNI-048 | changeUserRole › degrada a un ADMIN a USER | `expect(result.role).toBe('USER')` | Pasa (0 ms) |

### `tests/unit/control-roles/changeUserRole.use-case.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-049 | changeUserRole › lanza AppError 400 y no modifica ningún registro si userId === requesterId | `await expect(`<br>`).rejects.toMatchObject({`<br>`expect(prismaMock.user.update).not.toHaveBeenCalled()` | Pasa (8 ms) |
| B-UNI-050 | changeUserRole › el error lanzado es una instancia de AppError | `await expect(`<br>`).rejects.toBeInstanceOf(AppError)` | Pasa (1 ms) |
| B-UNI-051 | changeUserRole › cambia el rol de otro usuario cuando quien pide el cambio es un admin distinto | `expect(result.id).toBe(otro.id)`<br>`expect(result.role).toBe('ADMIN')` | Pasa (1 ms) |

### `tests/unit/control-roles/requireAdmin.middleware.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-052 | requireAdmin middleware › responde 403 y bloquea el acceso si el usuario no es ADMIN | `expect(res.status).toHaveBeenCalledWith(403)`<br>`expect(res.json).toHaveBeenCalledWith({ error: 'Acceso restringido a administradores' })`<br>`expect(next).not.toHaveBeenCalled()` | Pasa (5 ms) |
| B-UNI-053 | requireAdmin middleware › llama a next() si el usuario tiene rol ADMIN | `expect(next).toHaveBeenCalledTimes(1)`<br>`expect(res.status).not.toHaveBeenCalled()` | Pasa (1 ms) |

### `tests/unit/errores/error.middleware.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-054 | AppError — errores esperados del negocio › responde con el código y el mensaje que trae el error | `expect(status).toHaveBeenCalledWith(401)`<br>`expect(json).toHaveBeenCalledWith({ error: 'Credenciales inválidas' })` | Pasa (32 ms) |
| B-UNI-055 | AppError — errores esperados del negocio › no ensucia la consola: un 403 no es una falla del servidor | `expect(console.error).not.toHaveBeenCalled()` | Pasa (1 ms) |
| B-UNI-056 | AppError — errores esperados del negocio › respeta el código de cada caso | `expect(status).toHaveBeenCalledWith(codigo)` | Pasa (1 ms) |
| B-UNI-057 | ZodError — red de seguridad de validación › un dato de entrada malo es 400, no 500 | `expect(status).toHaveBeenCalledWith(400)`<br>`expect(json).toHaveBeenCalledWith(` | Pasa (3 ms) |
| B-UNI-058 | ZodError — red de seguridad de validación › cada problema de Zod sale como { field, message } | `expect(json).toHaveBeenCalledWith({` | Pasa (1 ms) |
| B-UNI-059 | ZodError — red de seguridad de validación › con varios campos malos, sale uno por campo | `expect(json).toHaveBeenCalledWith({` | Pasa (3 ms) |
| B-UNI-060 | ZodError — red de seguridad de validación › tampoco se loggea: la culpa es del cliente, no del servidor | `expect(console.error).not.toHaveBeenCalled()` | Pasa (1 ms) |
| B-UNI-061 | Cualquier otro error — 500 › el cliente recibe un mensaje genérico | `expect(status).toHaveBeenCalledWith(500)`<br>`expect(json).toHaveBeenCalledWith(` | Pasa (5 ms) |
| B-UNI-062 | Cualquier otro error — 500 › fuera de producción sí viaja el detalle, para diagnosticar | `expect(json).toHaveBeenCalledWith({` | Pasa (1 ms) |
| B-UNI-063 | Cualquier otro error — 500 › en producción no se filtra nada del error interno | `expect(json).toHaveBeenCalledWith({ error: 'Error interno del servidor' })`<br>`expect(json).not.toHaveBeenCalledWith(` | Pasa (1 ms) |
| B-UNI-064 | Cualquier otro error — 500 › el log del servidor conserva mensaje y traza, aunque el cliente no los vea | `expect(console.error).toHaveBeenCalledWith('[ERROR 500]', 'Something broke')`<br>`expect(console.error).toHaveBeenCalledWith(err.stack)` | Pasa (1 ms) |
| B-UNI-065 | En todos los casos › nunca delega con next(): el manejador es el último de la cadena | `expect(next).not.toHaveBeenCalled()` | Pasa (1 ms) |

### `tests/unit/favoritos/favorites.use-cases.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-066 | addFavorite › si el celular no existe → 404 y no se escribe nada | `await expect(`<br>`).rejects.toMatchObject({`<br>`expect(favoritos.add).not.toHaveBeenCalled()` | Pasa (9 ms) |
| B-UNI-067 | addFavorite › si el celular existe, lo marca para ese usuario | `expect(favoritos.add).toHaveBeenCalledWith(USER_ID, PHONE_ID)` | Pasa (2 ms) |
| B-UNI-068 | addFavorite › comprueba el catálogo antes de escribir, no después | `expect(orden).toEqual(['buscar celular', 'marcar favorito'])` | Pasa (1 ms) |
| B-UNI-069 | removeFavorite › pide quitar la marca de ese usuario y ese celular | `expect(favoritos.remove).toHaveBeenCalledWith(USER_ID, PHONE_ID)` | Pasa (1 ms) |
| B-UNI-070 | removeFavorite › no comprueba que el celular exista: quitar es idempotente por diseño | `await expect(` | Pasa (1 ms) |
| B-UNI-071 | getMyFavorites › consulta la lista del usuario que se le pasa | `expect(favoritos.findByUser).toHaveBeenCalledWith(USER_ID)` | Pasa (5 ms) |
| B-UNI-072 | getMyFavorites › sin favoritos devuelve una lista vacía, no null | `await expect(getMyFavorites(favoritos, USER_ID)).resolves.toEqual([])` | Pasa (1 ms) |
| B-UNI-073 | getMyFavorites › devuelve los celulares tal como los entrega el repositorio | `await expect(getMyFavorites(favoritos, USER_ID)).resolves.toEqual(celulares)` | Pasa (1 ms) |

### `tests/unit/gestion-perfil/changePassword.use-case.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-074 | changePassword › guarda la contraseña nueva hasheada cuando la actual es correcta | `expect(prismaMock.user.update).toHaveBeenCalledWith({` | Pasa (5 ms) |
| B-UNI-075 | changePassword › nunca guarda la contraseña nueva en texto plano | `expect(guardada).not.toBe('Nueva1234')` | Pasa (1 ms) |
| B-UNI-076 | changePassword › rechaza con 400 (no 401) si la contraseña actual no coincide | `await expect(`<br>`).rejects.toMatchObject({`<br>`expect(prismaMock.user.update).not.toHaveBeenCalled()` | Pasa (2 ms) |
| B-UNI-077 | changePassword › lanza 404 si el usuario ya no existe | `await expect(`<br>`).rejects.toMatchObject({ statusCode: 404 })`<br>`expect(prismaMock.user.update).not.toHaveBeenCalled()` | Pasa (1 ms) |

### `tests/unit/gestion-perfil/updateProfile.use-case.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-078 | getProfile › devuelve el perfil sin la contraseña | `expect(perfil).toMatchObject({ id: u.id, name: 'Ana Pérez', email: u.email })`<br>`expect(perfil).not.toHaveProperty('password')` | Pasa (7 ms) |
| B-UNI-079 | getProfile › lanza 404 si el usuario ya no existe | `await expect(getProfile(repo, ID_INEXISTENTE)).rejects.toMatchObject({` | Pasa (1 ms) |
| B-UNI-080 | updateProfile › actualiza solo el nombre y devuelve el perfil sin la contraseña | `expect(prismaMock.user.update).toHaveBeenCalledWith({`<br>`expect(perfil.name).toBe('Ana María Pérez')`<br>`expect(perfil).not.toHaveProperty('password')` | Pasa (2 ms) |
| B-UNI-081 | updateProfile › traduce P2025 (usuario eliminado) a 404 | `await expect(`<br>`).rejects.toMatchObject({ statusCode: 404, message: 'Usuario no encontrado' })` | Pasa (1 ms) |
| B-UNI-082 | updateProfile › propaga cualquier otro error de la base sin disfrazarlo de 404 | `await expect(updateProfile(repo, 'u1', { name: 'Nombre' })).rejects.toThrow(` | Pasa (1 ms) |
| B-UNI-083 | updateProfileDto › recorta los espacios del nombre | `expect(r.success && r.data.name).toBe('Ana')` | Pasa (1 ms) |
| B-UNI-084 | updateProfileDto › rechaza un nombre vacío | `expect(updateProfileDto.safeParse({ name }).success).toBe(false)` | Pasa (1 ms) |
| B-UNI-085 | updateProfileDto › rechaza un nombre de una letra tras recortar | `expect(updateProfileDto.safeParse({ name }).success).toBe(false)` | Pasa (3 ms) |
| B-UNI-086 | updateProfileDto › rechaza un nombre de más de 80 caracteres | `expect(updateProfileDto.safeParse({ name }).success).toBe(false)` | Pasa (0 ms) |
| B-UNI-087 | updateProfileDto › descarta role, email y banned: el perfil no puede cambiar la identidad ni el rol | `expect(r.success && r.data).toEqual({ name: 'Ana' })` | Pasa (1 ms) |

### `tests/unit/gestion-usuarios/ban.controller.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-088 | admin.controller — ban() › responde con el usuario baneado cuando banUser() resuelve sin error | `expect(res.json).toHaveBeenCalledWith({`<br>`expect(next).not.toHaveBeenCalled()` | Pasa (9 ms) |
| B-UNI-089 | admin.controller — ban() › invoca next(error) cuando el id no existe | `expect(next).toHaveBeenCalledWith(`<br>`expect(res.json).not.toHaveBeenCalled()` | Pasa (1 ms) |
| B-UNI-090 | admin.controller — ban() › le pasa al caso de uso el id del admin que hace la petición, y ese admin no puede banearse a sí mismo | `expect(next).toHaveBeenCalledWith(`<br>`expect(prismaMock.user.update).not.toHaveBeenCalled()` | Pasa (1 ms) |

### `tests/unit/gestion-usuarios/unban.controller.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-091 | admin.controller — unban() › responde con el usuario desbaneado cuando unbanUser() resuelve sin error | `expect(res.json).toHaveBeenCalledWith({`<br>`expect(next).not.toHaveBeenCalled()` | Pasa (9 ms) |
| B-UNI-092 | admin.controller — unban() › invoca next(error) cuando el id no existe | `expect(next).toHaveBeenCalledWith(`<br>`expect(res.json).not.toHaveBeenCalled()` | Pasa (2 ms) |

### `tests/unit/login/authenticate.middleware.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-093 | authenticate middleware › responde 401 "Token requerido" si no hay header Authorization | `expect(res.status).toHaveBeenCalledWith(401)`<br>`expect(res.json).toHaveBeenCalledWith({ error: 'Token requerido' })`<br>`expect(next).not.toHaveBeenCalled()` | Pasa (5 ms) |
| B-UNI-094 | authenticate middleware › responde 401 "Token requerido" si el header no tiene el prefijo Bearer | `expect(res.status).toHaveBeenCalledWith(401)`<br>`expect(next).not.toHaveBeenCalled()` | Pasa (1 ms) |
| B-UNI-095 | authenticate middleware › responde 401 "Token inválido o expirado" si la firma no corresponde al JWT_SECRET del servidor | `expect(res.status).toHaveBeenCalledWith(401)`<br>`expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado' })`<br>`expect(next).not.toHaveBeenCalled()` | Pasa (4 ms) |
| B-UNI-096 | authenticate middleware › responde 401 "Token inválido o expirado" si el token ya venció | `expect(res.status).toHaveBeenCalledWith(401)`<br>`expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado' })`<br>`expect(next).not.toHaveBeenCalled()` | Pasa (2 ms) |
| B-UNI-097 | authenticate middleware › responde 401 si el token es válido pero el usuario ya no existe | `expect(res.status).toHaveBeenCalledWith(401)`<br>`expect(next).not.toHaveBeenCalled()` | Pasa (1 ms) |
| B-UNI-098 | authenticate middleware › responde 403 con el motivo si la cuenta está baneada | `expect(res.status).toHaveBeenCalledWith(403)`<br>`expect(res.json).toHaveBeenCalledWith({`<br>`expect(next).not.toHaveBeenCalled()` | Pasa (3 ms) |
| B-UNI-099 | authenticate middleware › asigna req.user y llama a next() si el token es válido | `expect(req.user).toMatchObject({ id: user.id, role: 'USER' })`<br>`expect(next).toHaveBeenCalledTimes(1)`<br>`expect(res.status).not.toHaveBeenCalled()` | Pasa (2 ms) |
| B-UNI-100 | authenticate middleware › usa el rol vigente en la base y no el que trae el token | `expect(req.user?.role).toBe('USER')`<br>`expect(next).toHaveBeenCalledTimes(1)` | Pasa (1 ms) |

### `tests/unit/login/login-enumeracion.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-101 | loginUser — sin enumeración de usuarios › ejecuta bcrypt.compare aunque el correo no exista | `await expect(`<br>`).rejects.toMatchObject({ statusCode: 401 })`<br>`expect(compare).toHaveBeenCalledTimes(1)`<br>(+1 aserciones más) | Pasa (6 ms) |
| B-UNI-102 | loginUser — sin enumeración de usuarios › responde exactamente igual a correo inexistente y a contraseña equivocada | `expect({ s: inexistente.statusCode, m: inexistente.message }).toEqual({` | Pasa (2 ms) |
| B-UNI-103 | loginUser — sin enumeración de usuarios › a una cuenta suspendida con contraseña equivocada le responde 401, sin revelar la suspensión | `await expect(`<br>`).rejects.toMatchObject({ statusCode: 401, message: 'Credenciales inválidas' })` | Pasa (1 ms) |

### `tests/unit/login/loginUser.use-case.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-104 | loginUser › lanza 401 "Credenciales inválidas" si el usuario no existe | `await expect(`<br>`).rejects.toMatchObject({` | Pasa (5 ms) |
| B-UNI-105 | loginUser › lanza 401 "Credenciales inválidas" si la contraseña no coincide | `await expect(`<br>`).rejects.toMatchObject({` | Pasa (1 ms) |
| B-UNI-106 | loginUser › lanza 403 con el motivo cuando la cuenta está baneada | `await expect(`<br>`).rejects.toMatchObject({` | Pasa (1 ms) |
| B-UNI-107 | loginUser › retorna user + token cuando las credenciales son válidas y la cuenta está activa | `expect(result.user).not.toHaveProperty('password')`<br>`expect(result.user.email).toBe('user@correo.com')`<br>`expect(payload.id).toBe(creado.id)`<br>(+1 aserciones más) | Pasa (6 ms) |

### `tests/unit/pedidos/orders.use-cases.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-108 | createOrder › crea el pedido calculando el subtotal y el total a partir del precio real de los celulares | `expect(result.subtotal).toBe(250_000)`<br>`expect(result.shipping).toBe(20_000)`<br>`expect(result.total).toBe(270_000)`<br>(+2 aserciones más) | Pasa (7 ms) |
| B-UNI-109 | createOrder › crea el pedido sin userId cuando la compra es de un invitado | `expect(result.userId).toBeNull()` | Pasa (1 ms) |
| B-UNI-110 | createOrder › el envío es gratis cuando el subtotal supera los 500.000 | `expect(result.shipping).toBe(0)`<br>`expect(result.total).toBe(600_000)` | Pasa (1 ms) |
| B-UNI-111 | createOrder › descuenta el stock del celular comprado | `expect(prismaMock.phone.updateMany).toHaveBeenCalledWith({` | Pasa (3 ms) |
| B-UNI-112 | createOrder › lanza AppError 404 si algún celular del pedido no existe | `await expect(createOrder(repo, orderData, 'u1')).rejects.toMatchObject({`<br>`expect(prismaMock.order.create).not.toHaveBeenCalled()` | Pasa (3 ms) |
| B-UNI-113 | createOrder › lanza AppError 400 y no descuenta stock cuando el stock es insuficiente | `await expect(createOrder(repo, orderData)).rejects.toMatchObject({` | Pasa (1 ms) |
| B-UNI-114 | createOrderDto validation › rejects when "email" is missing | `expect(() => createOrderDto.parse(data)).toThrow(z.ZodError)` | Pasa (7 ms) |
| B-UNI-115 | createOrderDto validation › rejects when "name" is missing | `expect(() => createOrderDto.parse(data)).toThrow(z.ZodError)` | Pasa (1 ms) |
| B-UNI-116 | createOrderDto validation › rejects when "phone" is missing | `expect(() => createOrderDto.parse(data)).toThrow(z.ZodError)` | Pasa (1 ms) |
| B-UNI-117 | createOrderDto validation › rejects when "address" is missing | `expect(() => createOrderDto.parse(data)).toThrow(z.ZodError)` | Pasa (1 ms) |
| B-UNI-118 | createOrderDto validation › rejects when "city" is missing | `expect(() => createOrderDto.parse(data)).toThrow(z.ZodError)` | Pasa (0 ms) |
| B-UNI-119 | createOrderDto validation › rejects when "dept" is missing | `expect(() => createOrderDto.parse(data)).toThrow(z.ZodError)` | Pasa (1 ms) |
| B-UNI-120 | createOrderDto validation › rejects when "items" is missing | `expect(() => createOrderDto.parse(data)).toThrow(z.ZodError)` | Pasa (0 ms) |
| B-UNI-121 | createOrderDto validation › accepts a complete order | `expect(parsed).toEqual(datosCompletos())` | Pasa (1 ms) |
| B-UNI-122 | createOrderDto validation › rejects an invalid email | `expect(() =>` | Pasa (1 ms) |
| B-UNI-123 | createOrderDto validation › rejects an empty items array | `expect(() => createOrderDto.parse(makeOrderData([]))).toThrow(z.ZodError)` | Pasa (1 ms) |
| B-UNI-124 | createOrderDto validation › rejects a non-positive quantity | `expect(() => createOrderDto.parse(data)).toThrow(z.ZodError)` | Pasa (1 ms) |
| B-UNI-125 | createOrderDto validation › rejects a non-uuid phoneId | `expect(() => createOrderDto.parse(data)).toThrow(z.ZodError)` | Pasa (1 ms) |
| B-UNI-126 | getMyOrders › returns all orders for the given user | `expect(prismaMock.order.findMany).toHaveBeenCalledWith(`<br>`expect(result).toHaveLength(2)`<br>`expect(result.every((o) => o.userId === 'u1')).toBe(true)` | Pasa (4 ms) |
| B-UNI-127 | getMyOrders › returns an empty array when the user has no orders | `expect(result).toEqual([])` | Pasa (1 ms) |
| B-UNI-128 | getAllOrders › returns a paginated list of orders | `expect(result.data).toHaveLength(2)`<br>`expect(result.meta).toEqual({ total: 3, page: 1, limit: 2, totalPages: 2 })` | Pasa (1 ms) |
| B-UNI-129 | updateOrderStatus › actualiza el estado de un pedido existente (CONFIRMED → SHIPPED es una transición válida) | `expect(result.status).toBe('SHIPPED')` | Pasa (1 ms) |
| B-UNI-130 | updateOrderStatus › rejects with 400 una transición inválida (de CONFIRMED a DELIVERED, saltándose SHIPPED) | `await expect(`<br>`).rejects.toMatchObject({ statusCode: 400 })`<br>`expect(prismaMock.order.update).not.toHaveBeenCalled()` | Pasa (1 ms) |
| B-UNI-131 | updateOrderStatus › rejects with 400 cuando el pedido ya está en ese estado | `await expect(`<br>`).rejects.toMatchObject({ statusCode: 400 })`<br>`expect(prismaMock.order.update).not.toHaveBeenCalled()` | Pasa (1 ms) |
| B-UNI-132 | updateOrderStatus › rejects with 404 cuando el pedido no existe | `await expect(`<br>`).rejects.toMatchObject({ statusCode: 404 })` | Pasa (1 ms) |

### `tests/unit/registro/register.validate-dto.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-133 | registerDto (validación del body en POST /auth/register) › rechaza un body con password demasiado corto | `expect(result.success).toBe(false)`<br>`expect(error?.message).toBe('La contraseña debe tener al menos 8 caracteres')` | Pasa (25 ms) |
| B-UNI-134 | registerDto (validación del body en POST /auth/register) › rechaza un body sin el campo name | `expect(result.success).toBe(false)` | Pasa (1 ms) |
| B-UNI-135 | registerDto (validación del body en POST /auth/register) › rechaza un name de una sola letra | `expect(result.success).toBe(false)`<br>`expect(error?.message).toBe('El nombre debe tener al menos 2 caracteres')` | Pasa (1 ms) |
| B-UNI-136 | registerDto (validación del body en POST /auth/register) › acumula todos los errores del body, no solo el primero | `expect(result.success).toBe(false)`<br>`expect(campos).toEqual(expect.arrayContaining(['email', 'name', 'password']))` | Pasa (1 ms) |
| B-UNI-137 | registerDto (validación del body en POST /auth/register) › acepta un body válido y retorna los datos parseados | `expect(result.success).toBe(true)`<br>`expect(result.data).toEqual(body)` | Pasa (1 ms) |
| B-UNI-138 | registerDto (validación del body en POST /auth/register) › descarta los campos que no están en el esquema | `expect(result.success).toBe(true)`<br>`expect(result.data).not.toHaveProperty('role')` | Pasa (1 ms) |

### `tests/unit/registro/registerUser.use-case.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-139 | registerUser › lanza AppError 409 cuando el email ya existe | `await expect(`<br>`).rejects.toMatchObject({`<br>`expect(prismaMock.user.create).not.toHaveBeenCalled()` | Pasa (6 ms) |
| B-UNI-140 | registerUser › el error lanzado es una instancia de AppError | `await expect(`<br>`).rejects.toBeInstanceOf(AppError)` | Pasa (1 ms) |
| B-UNI-141 | registerUser › crea el usuario, hashea la contraseña con bcrypt y retorna user + token sin exponer el password | `expect(result.user).not.toHaveProperty('password')`<br>`expect(result.user.email).toBe('user@correo.com')`<br>`expect(guardado.data.password).not.toBe('password123')`<br>(+3 aserciones más) | Pasa (7 ms) |
| B-UNI-142 | registerUser — costo de bcrypt configurable › con BCRYPT_COST="" hashea con costo 12 | `expect(costoBcrypt()).toBe(esperado)`<br>`expect(spy).toHaveBeenCalledWith('Password123', esperado)` | Pasa (2 ms) |
| B-UNI-143 | registerUser — costo de bcrypt configurable › con BCRYPT_COST="10" hashea con costo 10 | `expect(costoBcrypt()).toBe(esperado)`<br>`expect(spy).toHaveBeenCalledWith('Password123', esperado)` | Pasa (1 ms) |
| B-UNI-144 | registerUser — costo de bcrypt configurable › con BCRYPT_COST="8" hashea con costo 10 | `expect(costoBcrypt()).toBe(esperado)`<br>`expect(spy).toHaveBeenCalledWith('Password123', esperado)` | Pasa (1 ms) |
| B-UNI-145 | registerUser — costo de bcrypt configurable › con BCRYPT_COST="20" hashea con costo 14 | `expect(costoBcrypt()).toBe(esperado)`<br>`expect(spy).toHaveBeenCalledWith('Password123', esperado)` | Pasa (1 ms) |
| B-UNI-146 | registerUser — costo de bcrypt configurable › con BCRYPT_COST="abc" hashea con costo 12 | `expect(costoBcrypt()).toBe(esperado)`<br>`expect(spy).toHaveBeenCalledWith('Password123', esperado)` | Pasa (1 ms) |

### `tests/unit/validacion-credenciales/emailSchema.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-147 | validación de email — formato (registro y login) › rechaza un correo sin dominio | `expect(errorDeEmail(registerDto.safeParse({ ...base, email }))).toBe('Email inválido')` | Pasa (26 ms) |
| B-UNI-148 | validación de email — formato (registro y login) › rechaza un correo sin arroba | `expect(errorDeEmail(registerDto.safeParse({ ...base, email }))).toBe('Email inválido')` | Pasa (2 ms) |
| B-UNI-149 | validación de email — formato (registro y login) › rechaza un correo sin nombre | `expect(errorDeEmail(registerDto.safeParse({ ...base, email }))).toBe('Email inválido')` | Pasa (1 ms) |
| B-UNI-150 | validación de email — formato (registro y login) › rechaza un correo vacío | `expect(errorDeEmail(registerDto.safeParse({ ...base, email }))).toBe('Email inválido')` | Pasa (1 ms) |
| B-UNI-151 | validación de email — formato (registro y login) › aplica el mismo formato en loginDto | `expect(loginDto.safeParse({ email: 'usuario@', password: 'x' }).success).toBe(false)`<br>`expect(loginDto.safeParse({ email: 'user@gmail.com', password: 'x' }).success).toBe(true)` | Pasa (1 ms) |
| B-UNI-152 | validación de email — normalización › el registro guarda el correo en minúsculas y sin espacios | `expect(r.success && r.data.email).toBe('ana.perez@gmail.com')` | Pasa (1 ms) |
| B-UNI-153 | validación de email — normalización › el login normaliza igual, así que encuentra la cuenta escrita con mayúsculas | `expect(r.success && r.data.email).toBe('ana.perez@gmail.com')` | Pasa (0 ms) |
| B-UNI-154 | validación de email — dominios permitidos (solo registro) › acepta el dominio gmail.com | `expect(registerDto.safeParse({ ...base, email: `user@${dominio}` }).success).toBe(true)` | Pasa (1 ms) |
| B-UNI-155 | validación de email — dominios permitidos (solo registro) › acepta el dominio outlook.com | `expect(registerDto.safeParse({ ...base, email: `user@${dominio}` }).success).toBe(true)` | Pasa (0 ms) |
| B-UNI-156 | validación de email — dominios permitidos (solo registro) › acepta el dominio hotmail.com | `expect(registerDto.safeParse({ ...base, email: `user@${dominio}` }).success).toBe(true)` | Pasa (0 ms) |
| B-UNI-157 | validación de email — dominios permitidos (solo registro) › acepta el dominio yahoo.com | `expect(registerDto.safeParse({ ...base, email: `user@${dominio}` }).success).toBe(true)` | Pasa (0 ms) |
| B-UNI-158 | validación de email — dominios permitidos (solo registro) › acepta el dominio icloud.com | `expect(registerDto.safeParse({ ...base, email: `user@${dominio}` }).success).toBe(true)` | Pasa (0 ms) |
| B-UNI-159 | validación de email — dominios permitidos (solo registro) › rechaza el dominio empresa.com con el mensaje que ve el usuario | `expect(errorDeEmail(registerDto.safeParse({ ...base, email: `user@${dominio}` }))).toBe(` | Pasa (0 ms) |
| B-UNI-160 | validación de email — dominios permitidos (solo registro) › rechaza el dominio gmail.co con el mensaje que ve el usuario | `expect(errorDeEmail(registerDto.safeParse({ ...base, email: `user@${dominio}` }))).toBe(` | Pasa (1 ms) |
| B-UNI-161 | validación de email — dominios permitidos (solo registro) › rechaza el dominio mail.gmail.com con el mensaje que ve el usuario | `expect(errorDeEmail(registerDto.safeParse({ ...base, email: `user@${dominio}` }))).toBe(` | Pasa (0 ms) |
| B-UNI-162 | validación de email — dominios permitidos (solo registro) › el login no exige dominio: la cuenta admin@celularpro.co puede ingresar | `expect(` | Pasa (1 ms) |

### `tests/unit/validacion-credenciales/login-limiter.middleware.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-163 | limitarIntentosLogin — ramas defensivas › sin req.ip ni email en el body agrupa los intentos bajo una clave común | `expect(next).not.toHaveBeenCalled()`<br>`expect(res.status).toHaveBeenCalledWith(429)` | Pasa (8 ms) |
| B-UNI-164 | limitarIntentosLogin — ramas defensivas › cuando falta menos de un minuto usa el singular "minuto" | `expect(res.json).toHaveBeenCalledWith({` | Pasa (3 ms) |
| B-UNI-165 | limitarIntentosLogin — ramas defensivas › una respuesta que no es 401 ni 200 (p. ej. 403) no suma ni borra fallos | `expect(next).toHaveBeenCalled()` | Pasa (1 ms) |

### `tests/unit/validacion-credenciales/password-policy.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-166 | política de contraseñas — regla de dominio › acepta una contraseña con minúscula, mayúscula y número de 8 caracteres | `expect(problemasDePassword('Clave123')).toEqual([])`<br>`expect(passwordSegura('Clave123')).toBe(true)` | Pasa (24 ms) |
| B-UNI-167 | política de contraseñas — regla de dominio › rechaza una contraseña corta | `expect(problemasDePassword(password)).toEqual([mensaje])` | Pasa (1 ms) |
| B-UNI-168 | política de contraseñas — regla de dominio › rechaza una contraseña sin minúscula | `expect(problemasDePassword(password)).toEqual([mensaje])` | Pasa (1 ms) |
| B-UNI-169 | política de contraseñas — regla de dominio › rechaza una contraseña sin mayúscula | `expect(problemasDePassword(password)).toEqual([mensaje])` | Pasa (0 ms) |
| B-UNI-170 | política de contraseñas — regla de dominio › rechaza una contraseña sin número | `expect(problemasDePassword(password)).toEqual([mensaje])` | Pasa (0 ms) |
| B-UNI-171 | política de contraseñas — regla de dominio › acumula todos los problemas en un orden fijo | `expect(problemasDePassword('abc')).toEqual([` | Pasa (0 ms) |
| B-UNI-172 | política de contraseñas — regla de dominio › con 7 caracteres la contraseña es válida: false | `expect(password).toHaveLength(longitud)`<br>`expect(passwordSegura(password)).toBe(esperado)` | Pasa (1 ms) |
| B-UNI-173 | política de contraseñas — regla de dominio › con 8 caracteres la contraseña es válida: true | `expect(password).toHaveLength(longitud)`<br>`expect(passwordSegura(password)).toBe(esperado)` | Pasa (1 ms) |
| B-UNI-174 | política de contraseñas — regla de dominio › con 72 caracteres la contraseña es válida: true | `expect(password).toHaveLength(longitud)`<br>`expect(passwordSegura(password)).toBe(esperado)` | Pasa (1 ms) |
| B-UNI-175 | política de contraseñas — regla de dominio › con 73 caracteres la contraseña es válida: false | `expect(password).toHaveLength(longitud)`<br>`expect(passwordSegura(password)).toBe(esperado)` | Pasa (1 ms) |
| B-UNI-176 | política de contraseñas — DTO de registro › devuelve el mensaje de la regla incumplida en el campo password | `expect(r.success).toBe(false)`<br>`expect(r.error.errors.map((e) => [e.path[0], e.message])).toEqual([` | Pasa (3 ms) |
| B-UNI-177 | política de contraseñas — DTO de registro › acepta una contraseña que cumple todas las reglas | `expect(registerDto.safeParse({ ...base, password: 'Password123' }).success).toBe(true)` | Pasa (1 ms) |
| B-UNI-178 | política de contraseñas — DTO de cambio de contraseña › aplica la misma política a la contraseña nueva | `expect(r.success).toBe(false)` | Pasa (1 ms) |
| B-UNI-179 | política de contraseñas — DTO de cambio de contraseña › no permite repetir la contraseña actual | `expect(r.success).toBe(false)`<br>`expect(r.error.errors[0]).toMatchObject({` | Pasa (1 ms) |
| B-UNI-180 | política de contraseñas — DTO de cambio de contraseña › exige la contraseña actual | `expect(r.success).toBe(false)` | Pasa (1 ms) |

### `tests/unit/validacion-credenciales/validate.middleware.test.ts`

| ID | Objetivo | Resultado esperado | Obtenido |
|---|---|---|---|
| B-UNI-181 | validate middleware › responde 400 con un arreglo de errores por campo cuando el body es inválido | `expect(res.status).toHaveBeenCalledWith(400)`<br>`expect(res.json).toHaveBeenCalledWith(`<br>`expect(next).not.toHaveBeenCalled()` | Pasa (15 ms) |
| B-UNI-182 | validate middleware › reemplaza req.body con los datos parseados y llama next() cuando el body es válido | `expect(req.body).toEqual({ name: 'Mario' })`<br>`expect(next).toHaveBeenCalledTimes(1)`<br>`expect(res.status).not.toHaveBeenCalled()` | Pasa (1 ms) |
| B-UNI-183 | validate middleware › valida req.query en lugar de req.body cuando source = "query" | `expect(req.query).toEqual({ name: 'Mario' })`<br>`expect(next).toHaveBeenCalledTimes(1)` | Pasa (1 ms) |
