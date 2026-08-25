# Pruebas automatizadas — CelularPro

Toda la suite del equipo vive en esta carpeta. Se ejecuta con un solo comando:

```bash
npm install     # solo la primera vez, o al cambiar de máquina
npm test
```

No hace falta tener Postgres encendido ni el servidor corriendo: la capa de base
de datos está simulada, así que la suite completa tarda unos 3 segundos.

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
├── setup.ts                  Reemplaza el cliente Prisma y bcrypt antes de cada archivo
├── helpers/
│   ├── prisma-mock.ts        Doble de prueba de la base de datos
│   └── datos.ts              Tokens, usuarios y celulares de ejemplo
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
ruta HTTP real: pasa por el router, `auth.middleware`, `validate.middleware`, el
controlador, el caso de uso y el repositorio. Solo se simula la base de datos.

El nombre de cada test lleva su camino y la secuencia de nodos, para poder
contrastarlo directamente contra el diagrama:

```
Camino 5 (1-3-5-7-9-10-14): un admin no puede banearse a sí mismo (RN-05) → 400
```

**`unit/`** — Pruebas aisladas de una sola pieza: un caso de uso con un
repositorio falso, un middleware con `req`/`res` falsos, o un esquema de Zod
directamente. Son más rápidas y señalan con más precisión dónde está la falla.

## Cómo se simula la base de datos

`setup.ts` intercepta `src/infrastructure/database/prisma.ts` y lo reemplaza por
`helpers/prisma-mock.ts`. Cada prueba declara qué debe devolver la base:

```ts
prismaMock.user.update.mockResolvedValue(filaUsuario({ banned: true }))
```

También se simula `bcrypt`, que es un módulo nativo compilado para el sistema
operativo donde se instaló. Sin eso la suite no correría en otra máquina ni en
un pipeline de integración continua.

## Verificación de la suite

Ver los tests en verde no prueba nada por sí solo: una prueba mal escrita pasa
siempre. Para comprobar que realmente detectan fallas, se rompió el backend a
propósito ocho veces y se confirmó que cayeran los tests correctos:

| Qué se le quitó al código | Qué falló |
|---|---|
| La regla de autobaneo | ESC-26 camino 5 |
| El chequeo de slug duplicado | ESC-30 camino 5 |
| La traducción de P2025 a 404 | ESC-26 camino 6 y ESC-27 camino 4 |
| El guardia de rol ADMIN | Los 5 caminos de rol + `requireAdmin` |
| El bloqueo de cuenta baneada | `authenticate middleware` |
| La regla de no cambiarse el propio rol | Los 3 de `changeUserRole` |
| La validación de transición de estado | `updateOrderStatus` |
| El ocultamiento del password | `registerUser` |

Las ocho fueron detectadas, y ninguna prueba de más se cayó.
