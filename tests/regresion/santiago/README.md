# Pruebas de regresión — funcionalidades 13, 26, 27, 28, 29 y 30 (back)

Esta carpeta adapta el repositorio del curso
[RegressionTesting](https://github.com/mauricioramirezv/RegressionTesting) a la
API de CelularPro. Se mantienen las mismas cuatro categorías del repositorio
(regresión funcional, API, rendimiento y seguridad), pero en vez de la
calculadora, el carrito y la API de productos de ejemplo, cada prueba ataca una
de mis funcionalidades:

| ESC | Funcionalidad | Endpoint |
|---|---|---|
| 13 | Recomendación de productos | `GET /phones/:slug/similares` |
| 26 | Banear usuario | `PUT /admin/users/:id/ban` |
| 27 | Desbanear usuario | `PUT /admin/users/:id/unban` |
| 28 | Consultar usuarios | `GET /admin/users` |
| 29 | Panel de estadísticas | `GET /admin/stats` |
| 30 | Administración del catálogo | `GET /phones/id/:id`, `POST /phones`, `PUT /phones/:id`, `DELETE /phones/:id` |

No hace falta Postgres ni variables de entorno: igual que el resto de la suite,
solo se reemplaza el cliente de Prisma por un doble (`tests/setup.ts`). Rutas,
middlewares, controladores, casos de uso y repositorios corren de verdad.

## Cómo correrlas

Desde la raíz del back:

```bash
npm run test:regresion                 # las 4 categorías, con resumen al final
npm run test:regresion -- esc-26       # solo la funcionalidad 26, en las 4 categorías

npm run test:regresion:funcional       # solo regression-testing
npm run test:regresion:api             # solo api-testing
npm run test:regresion:performance     # solo performance-testing
npm run test:regresion:seguridad       # solo security-testing
```

Una prueba puntual, por nombre (el equivalente de `pytest -k`):

```bash
npx vitest run tests/regresion/santiago -t "DEF-26-02"
```

`npm run test:regresion:santiago` hace lo mismo que `run_all_tests.py`: corre cada
categoría en un proceso aparte y termina con un resumen así:

```text
regression-testing:              66 passed
api-testing:                     76 passed
performance-testing:             41 passed
security-testing:               103 passed
Total:                          286 passed

Todas las suites finalizaron correctamente.
```

Estas pruebas también están dentro de `npm test`, así que Jenkins las corre en
cada cambio junto con el resto de la suite. Por eso funcionan como regresión
de verdad: no hay que acordarse de ejecutarlas.

## Estructura

```text
tests/regresion/santiago/
├── ejecutar.mjs              el equivalente de run_all_tests.py
├── helpers/
│   ├── medicion.ts           medir(), repetir(), mediana(), latencia simulada
│   ├── acceso.ts             matriz de credenciales inválidas (401) y sin permiso (403),
│   │                         y el admin que esos tokens dicen ser
│   ├── estadisticas.ts       programa las 11 consultas del panel (ESC-29)
│   └── tokens.ts             JWT sin firma (alg: none) y JWT con firma inventada
├── regression-testing/       esc-13 … esc-30
├── api-testing/              esc-13 … esc-30
├── performance-testing/      esc-13 … esc-30
└── security-testing/         esc-13 … esc-30
```

Cada categoría tiene un archivo por funcionalidad, con el mismo nombre en las
cuatro carpetas. Por eso `-- esc-26` encuentra los cuatro archivos de la 26.

## Cuántas pruebas hay

| ESC | Regresión | API | Performance | Seguridad | Total |
|---|---:|---:|---:|---:|---:|
| 13 | 24 | 14 | 12 | 8 | 58 |
| 26 | 11 | 11 | 5 | 16 | 43 |
| 27 | 3 | 5 | 5 | 12 | 25 |
| 28 | 7 | 19 | 6 | 16 | 48 |
| 29 | 11 | 5 | 6 | 11 | 33 |
| 30 | 10 | 22 | 7 | 40 | 79 |
| **Total** | **66** | **76** | **41** | **103** | **286** |

La 30 tiene más pruebas de seguridad porque son cuatro operaciones (ver, crear,
editar y borrar) y cada una pasa por toda la matriz de acceso.

## Qué revisa cada categoría

**regression-testing** — el comportamiento que ya está aceptado. Todas siguen
AAA (`// Arrange`, `// Act`, `// Assert`) y prueban casos normales, valores
límite y excepciones: la tabla de verdad de la afinidad del ESC-13, los bordes
exactos del rango de precio (±25 %), el motivo de baneo de 3 y 4 caracteres,
el inicio del mes en el panel, que una edición parcial no borre fotos ni
resetee el `minStock`. Al final de cada archivo hay una sección *Defectos
corregidos* con una prueba por cada defecto que ya se arregló.

**api-testing** — el contrato HTTP, como `test_api.py`: códigos 200, 201, 204,
400, 404 y 409, los campos exactos de cada respuesta (con `to.have.all.keys`,
así que si sobra o falta un campo la prueba lo detecta), la paginación, y las
entradas inválidas parametrizadas con `it.each` (también una URL mal
codificada, que debe dar 400 y no 500). El ESC-30 incluye la prueba de
independencia de FIRST: una prueba crea un celular y lo consulta (200), y la
siguiente pide el mismo celular y recibe 404 porque no quedó rastro.

**performance-testing** — la misma estructura de `test_performance.py`:
primero que el resultado sea correcto, después que una entrada inválida se
rechace sin tocar la base, luego un presupuesto de tiempo amplio (500 ms) y por
último una comparación con la mediana de cinco mediciones. Además hay pruebas
de costo que no dependen del reloj: cuántas consultas hace cada operación y
cuántas salen en paralelo. Por ejemplo, el panel (ESC-29) hace exactamente 11
consultas, cada tanda lanza las suyas a la vez (4 de usuarios, 3 de celulares,
3 de pedidos) y los ingresos de 7 días salen de una sola consulta y no de una
por día. En el ESC-13 se cuenta cuántas veces se lee la marca de cada
candidato: debe ser exactamente una (n lecturas para n candidatos), así que
si alguien cambia el orden por la versión ingenua la prueba falla en cualquier
máquina, sin depender de cuánto tarde.

**security-testing** — autenticación (sin token, esquema Basic, firma de otro
secreto, token vencido, token sin firma `alg: none`, token alterado: todos
401, y en cada caso la base sí tiene al administrador que el token dice ser,
para que el 401 solo pueda venir de la verificación del token), autorización
(rol USER, un token que dice ADMIN pero en la base es USER,
un admin baneado: todos 403), asignación masiva (mandar `role`, `id` o
`createdAt` en el cuerpo no cambia nada), inyección (el texto del atacante
llega a Prisma como dato literal), que la contraseña nunca salga, que el baneo
surta efecto sobre un token que ya estaba emitido, y que en producción un error
de la base no filtre la cadena de conexión.

## Equivalencias con el repositorio del curso

El repositorio del curso está en Python y CelularPro en TypeScript, así que
cada herramienta tiene su equivalente:

| Curso (Python) | Aquí (TypeScript) |
|---|---|
| `pytest` | `vitest` |
| `@pytest.mark.parametrize` | `it.each` / `describe.each` |
| `assert_that(x, equal_to(y))` (PyHamcrest) | `expect(x).to.equal(y)` (Chai) |
| `TestClient(app)` | `request(app)` (supertest) |
| fixture `restaurar_productos` | `beforeEach` de `tests/setup.ts` que limpia el doble |
| `time.perf_counter()` | `medir()` en `helpers/medicion.ts` |
| `timeit.repeat(number=1, repeat=5)` | `repetir(operacion, 5)` |
| `statistics.median()` | `mediana()` |
| `pytest -k "texto"` | `vitest run -t "texto"` |
| `pytest -m performance` | `npm run test:regresion:performance` |
| `run_all_tests.py` | `npm run test:regresion` |

## Defectos que encontró esta suite

Al escribir las pruebas aparecieron tres defectos reales. Seguí el mismo orden
del ejercicio 4 del curso: primero la prueba, comprobar que fallaba por la
razón correcta, después la corrección mínima y por último toda la suite.

| Código | Qué pasaba | Corrección |
|---|---|---|
| DEF-REG-01 | Un JSON mal formado en el cuerpo (por ejemplo al banear o al crear un celular) o una URL mal codificada (`/phones/%E0%A4%A/similares`) respondían **500** y, fuera de producción, la respuesta traía el mensaje interno del parser. | `error.middleware.ts`: los errores 4xx que lanza Express antes de llegar a las rutas se responden con su propio código (**400**) y un mensaje según el tipo: "El cuerpo de la petición no es un JSON válido" o "Petición inválida". |
| DEF-REG-02 | Un cuerpo de más de 100 kB respondía **500** en vez de **413**. | La misma rama de `error.middleware.ts`. |
| DEF-REG-03 | El back aceptaba un motivo de baneo de solo espacios (`"      "` tiene 6 caracteres). El front sí lo bloqueaba, pero la API se puede llamar sin pasar por el front. | `admin.dto.ts`: `z.string().trim().min(4)`. El motivo ahora se guarda recortado. |

## Defectos anteriores que quedan protegidos

| Código | Prueba |
|---|---|
| DEF-26-01 — banear un id inexistente daba 500 | `regression-testing/esc-26` |
| DEF-26-02 — un admin podía banearse a sí mismo | `regression-testing/esc-26`, `security-testing/esc-26` |
| DEF-27-01 — desbanear un id inexistente daba 500 | `regression-testing/esc-27` |
| DEF-30-01 — un slug repetido daba 500 con la ruta interna | `regression-testing/esc-30`, `api-testing/esc-30` |
| `GET /phones/id/:id` era pública | `regression-testing/esc-30`, `security-testing/esc-30` |

## Actividad: defectos controlados (ejercicio 3 del curso)

Para comprobar que la suite realmente detecta regresiones, introduje uno por
uno estos defectos en el código de cada funcionalidad, corrí la suite y anoté
qué la detectó. Los trece se detectaron. Después de cada uno se restauró el
código original (estos cambios no van en ningún commit).

| ESC | Defecto introducido | Pruebas que fallan | Dónde |
|---|---|---:|---|
| 13 | El rango de precio deja de incluir su límite inferior (`>=` → `>`) | 1 | regresión |
| 13 | La recomendación lee 100 candidatos por cada uno pedido | 4 | api, seguridad |
| 26 | Se quita la regla de no banearse a sí mismo | 2 | regresión, seguridad |
| 26 | El middleware deja de revisar si la cuenta está suspendida | 13 | regresión y seguridad de 26 a 30 |
| 27 | El desbaneo deja guardado el motivo del baneo | 3 | regresión, seguridad |
| 28 | El listado devuelve la contraseña | 6 | api y seguridad de 26, 27 y 28 |
| 28 | El conteo y la página se consultan en serie | 2 | performance |
| 29 | Los pedidos cancelados vuelven a sumar a los ingresos | 1 | regresión |
| 29 | "Este mes" empieza el último día del mes anterior | 3 | regresión |
| 30 | Un slug repetido vuelve a responder 500 | 2 | api, regresión |
| 13 | El orden vuelve a la versión ingenua (afinidad dentro del comparador) | 2 | performance |
| 26–30 | `jwt.verify` se cambia por `jwt.decode` (se deja de revisar la firma) | 32 | seguridad de 26 a 30 |
| 29 | La tanda de conteos de celulares pasa a hacerse en serie | 1 | performance |

Los tres últimos sirvieron para mejorar la suite, porque en la primera versión
pasaban sin que nada fallara:

- Con `jwt.decode`, las pruebas 401 seguían en verde porque la base no tenía
  al usuario del token y el middleware respondía 401 por "usuario no existe".
  Ahora cada prueba 401 programa ese administrador como activo.
- La versión ingenua del orden solo se comparaba por tiempo, y con 20.000
  candidatos la diferencia a veces no alcanzaba a notarse. Ahora hay un
  conteo determinista de cuántas veces se puntúa cada candidato.
- El panel solo revisaba la tanda más grande (4 a la vez). Ahora cada tanda se
  revisa por separado.

Para repetirlo en clase basta con hacer uno de esos cambios, correr
`npm run test:regresion` y ver qué prueba falla y con qué mensaje.

## FIRST

- **Fast:** toda la suite corre en segundos; no hay base ni red.
- **Independent:** cada prueba programa su propio doble y `tests/setup.ts` lo
  limpia antes de la siguiente.
- **Repeatable:** sin `Math.random` ni fechas reales donde importan. El panel
  (ESC-29) calcula "este mes" con el reloj del sistema, así que esas pruebas
  fijan la fecha con `vi.setSystemTime` (el caso del ejercicio 2 del curso: una
  prueba que falla el primer día del mes).
- **Self-validating:** todas terminan en una aserción; ninguna depende de mirar
  la consola.
- **Timely:** se escribieron junto con las funcionalidades y quedaron en el
  pipeline.

## Alcance

Igual que en el repositorio del curso: un presupuesto de tiempo medido en una
sola máquina no reemplaza una prueba de carga con k6, JMeter o Locust, y las
pruebas de seguridad no reemplazan una revisión basada en OWASP. Los
presupuestos son amplios a propósito para que no fallen en un computador más
lento ni en Jenkins.
