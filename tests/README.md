# Pruebas automatizadas — CelularPro

Toda la suite del equipo vive en esta carpeta. No usa ningún mock: corre
contra una Postgres real, con bcrypt y jsonwebtoken reales de principio a
fin. Antes de correrla hay que preparar esa base, una sola vez por máquina.

## 1. Preparar la base de pruebas (una sola vez)

Esta suite borra todas las tablas antes de cada prueba (ver
`helpers/db.ts`), así que **nunca debe apuntar a la base compartida del
equipo** (la de `.env`/`.env.example`). Cada integrante necesita su propia
base, local, solo para los tests:

```bash
createdb celularpro_test
```

Copia `.env.test.example` a `.env.test` y pon ahí tu usuario/contraseña:

```bash
cp .env.test.example .env.test
# edita .env.test con tu usuario y contraseña de Postgres
```

Aplica las migraciones sobre esa base (no sobre la de desarrollo):

```bash
npx dotenv -e .env.test -- npx prisma migrate deploy
```

`tests/setup.ts` revisa que `DATABASE_URL` contenga la palabra `"test"` y
corta la ejecución si no la encuentra, como última protección por si este
paso se hace mal.

## 2. Correr la suite

```bash
npm install     # solo la primera vez, o al cambiar de máquina
npm test
```

Como todas las pruebas comparten una sola base real, corren una detrás de
otra (no en paralelo) para que no se pisen entre sí. Por eso la suite tarda
más que una basada en mocks, pero a cambio prueba código real de punta a
punta: rutas, middlewares, casos de uso, repositorios y Postgres.

Otros comandos:

```bash
npm run test:watch                          # se re-ejecuta al guardar
npm run test:coverage                       # reporte de cobertura
npm test tests/escenarios                   # solo un grupo
npm test -- -t "Camino 5"                   # filtrar por nombre
```

## Estructura

```
tests/
├── setup.ts                  Revisa DATABASE_URL y cierra Prisma al final de cada archivo
├── helpers/
│   ├── db.ts                 limpiarBaseDeDatos(): borra todas las tablas en orden seguro
│   └── fixtures.ts           crearUsuario, crearCelular, generarToken, etc. — todo con Prisma real
├── escenarios/               Pruebas de camino básico sobre la API completa
│   ├── esc-26-banear-usuario.test.ts
│   ├── esc-27-desbanear-usuario.test.ts
│   ├── esc-28-consultar-usuarios.test.ts
│   ├── esc-29-panel-estadisticas.test.ts
│   └── esc-30-administracion-catalogo.test.ts
└── unit/                     Pruebas unitarias por caso de uso, middleware y DTO
    ├── control-roles/
    ├── gestion-perfil/
    ├── login/
    ├── pedidos/
    ├── registro/
    └── validacion-credenciales/
```

## Los dos niveles de prueba

**`escenarios/`** — Un archivo por escenario de prueba documentado. Cada test
recorre un camino básico del grafo de flujo correspondiente, entrando por la
ruta HTTP real: pasa por el router, `auth.middleware`, `validate.middleware`,
el controlador, el caso de uso y el repositorio, hasta llegar a Postgres.

El nombre de cada test lleva su camino y la secuencia de nodos, para poder
contrastarlo directamente contra el diagrama:

```
Camino 5 (1-3-5-7-9-10-14): un admin no puede banearse a sí mismo (RN-05) → 400
```

**`unit/`** — Pruebas más aisladas: un caso de uso recibiendo el repositorio
real (`AdminRepository`, `UserRepository`, `OrderRepository`) en vez de
pasar por HTTP, o un middleware con `req`/`res` armados a mano. Los
esquemas de Zod (`register.validate-dto.test.ts`, `emailSchema.test.ts`) y
el middleware `validate` no tocan la base porque no la necesitan: son
lógica pura.

## Por qué no hay mocks

Antes esta suite reemplazaba el cliente Prisma y `bcrypt` por dobles de
prueba (`vi.mock()`), lo que la hacía rápida (2-3 segundos) pero probaba un
comportamiento simulado, no el real: si el repositorio armaba mal una
consulta, o si `bcrypt`/`jsonwebtoken` se usaban distinto de lo esperado,
el mock lo disimulaba.

Ahora cada prueba:

1. Limpia la base con `limpiarBaseDeDatos()`.
2. Inserta filas reales con los helpers de `fixtures.ts` (usuarios con
   contraseña hasheada de verdad, celulares con su categoría, tokens
   firmados con el JWT_SECRET real).
3. Ejerce el código de producción sin ningún atajo.
4. Verifica el resultado, y en varios casos también el estado que quedó en
   la base (por ejemplo, que el stock se haya descontado de verdad).

## Verificación de la suite

Ver los tests en verde no prueba nada por sí solo: una prueba mal escrita
pasa siempre. La versión anterior (con mocks) se verificó rompiendo el
backend a propósito ocho veces y confirmando que cayeran los tests
correctos — ver el historial de git para esa tabla. Al pasar a base de
datos real, conviene repetir ese mismo ejercicio: comentar temporalmente
una regla de negocio en el backend, correr `npm test`, confirmar que fallan
exactamente los tests esperados, y restaurar el archivo.
