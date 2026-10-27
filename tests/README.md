# Suite de pruebas — CelularPro API

418 pruebas en 43 archivos, 100% de cobertura sobre `src/`. **No necesita base
de datos ni variables de entorno**: el cliente Prisma se sustituye por un
doble, así que corre igual en cualquier equipo y en el pipeline.

```bash
npm test                  # toda la suite
npm run test:unit         # unitarias, por funcionalidad
npm run test:api          # escenarios sobre la API completa (Supertest)
npm run test:fluent       # aserciones fluidas con Chai
npm run test:regresion    # valores de negocio y defectos corregidos
npm run test:seguridad    # protecciones de credenciales y roles
npm run test:rendimiento  # presupuestos de tiempo (educativas)
npm run test:carga        # carga con autocannon (configuración aparte)
npm run test:coverage     # todo + coverage/lcov.info para SonarQube
```

## Tipos de prueba

| Carpeta | Pruebas | Qué cubre |
|---|---:|---|
| `unit/` | 183 | Casos de uso, middlewares, DTO y reglas de dominio, por funcionalidad |
| `escenarios/` | 162 | Caminos básicos (grafos de flujo) sobre la API completa |
| `fluent/` | 22 | Mismas reglas con aserciones fluidas de Chai (`expect(valor, 'contexto')`) |
| `regression/` | 20 | Números y mensajes de los que depende el negocio, y defectos ya corregidos |
| `seguridad/` | 27 | Fuerza bruta, asignación masiva, contraseñas en respuestas, rol leído de la base, token sin firma, JSON malformado |
| `rendimiento/` | 4 | Presupuestos de tiempo con límites amplios (no son pruebas de carga) |

## Mapa de las seis funcionalidades

| Funcionalidad | Unitarias | API | Fluidas, regresión, seguridad |
|---|---|---|---|
| Registro de usuario | `unit/registro/` | `escenarios/autenticacion` | `fluent/credenciales-y-perfil`, `seguridad` (asignación masiva) |
| Inicio de sesión | `unit/login/` (incluye anti-enumeración) | `escenarios/autenticacion` | `regression/regresion-credenciales` (correo con mayúsculas) |
| Gestión de perfil | `unit/gestion-perfil/` | `escenarios/gestion-perfil` | `fluent/credenciales-y-perfil` |
| Validación de credenciales | `unit/validacion-credenciales/` | `escenarios/autenticacion` | `regression`, `seguridad`, `rendimiento` |
| Control de roles | `unit/control-roles/`, `unit/gestion-usuarios/` | `escenarios/esc-26` a `esc-28`, `ramas-de-error` | `seguridad` (rol de la base, no del token) |
| Alerta de stock bajo | `unit/alertas/` | `escenarios/esc-31-alertas-stock` | `fluent/asserciones-fluidas`, `regression`, `rendimiento` |

Además hay pruebas de catálogo, pedidos, favoritos, estadísticas y manejo de
errores, que no forman parte de las seis funcionalidades.

## Cómo está montada

`tests/setup.ts` se ejecuta antes que cualquier archivo de prueba y:

1. Reemplaza `src/infrastructure/database/prisma` por el doble de
   `tests/helpers/prisma-mock.ts`.
2. Reemplaza `bcrypt` (módulo nativo, no portable entre sistemas) por un doble
   con la misma semántica: `hash("x")` produce `"hash:x"` y `compare()` lo verifica.
3. Deja el doble en blanco antes de cada prueba.

Rutas, middlewares, controladores, casos de uso y repositorios se ejecutan de
verdad. Cada prueba programa el doble para forzar el camino que le interesa:

```ts
prismaMock.user.update.mockResolvedValue(usuarioConConteo({ banned: true }))
prismaMock.user.update.mockRejectedValue(errorRegistroNoEncontrado()) // P2025 → 404
```

## Fixtures (`helpers/fixtures.ts`)

| Función | Para qué sirve |
|---|---|
| `usuario()` / `usuarioConConteo()` | Fila de un usuario (la segunda con `_count.orders`) |
| `celular()` | Fila de un celular con sus relaciones |
| `autenticar()` / `autenticarAdmin()` | `{ user, token }` y registra al usuario en el doble, porque `auth.middleware` relee su estado en cada request |
| `generarToken()` / `tokenConFirmaInvalida()` / `tokenExpirado()` | JWT reales, firmados con el secreto de pruebas |
| `errorRegistroNoEncontrado()` | El `PrismaClientKnownRequestError` P2025 real |
| `bodyCelularValido()` | Body mínimo que aprueba `createPhoneDto` |
| `alerta()` / `favorito()` | Filas de `Alert` y `Favorite` con su celular incluido |
| `ID_INEXISTENTE` | UUID que nunca corresponde a un registro |

## Cobertura

Quedan fuera del cálculo `src/domain/entities` y `src/domain/repositories`
(solo declaran tipos), `src/server.ts` y `src/infrastructure/database`
(arranque y siembra).

## Integración con el frontend

Las pruebas E2E del frontend (`frontend/e2e/`) pueden correr
contra esta API real: levante el backend con la base sembrada y siga las
instrucciones del modo real en `e2e/README.md`.
