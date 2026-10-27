# Criterio 2 — Seguridad y rendimiento

## 1. Seguridad

27 pruebas en `tests/seguridad/`, más 37 de validación de credenciales en
`tests/unit/validacion-credenciales/`. Detalle en [catalogo-pruebas.md](catalogo-pruebas.md#seguridad).

| Control verificado | Prueba (resultado esperado) | Obtenido |
|---|---|---|
| Fuerza bruta | 5 intentos fallidos sobre una cuenta → 401; el 6.º → 429 con `Retry-After`; 50 fallos desde una IP sobre cuentas distintas → 429 | Pasa (defecto corregido, ver 1.1) |
| Enumeración de usuarios | Correo inexistente y contraseña incorrecta: mismo código, mismo mensaje y `bcrypt.compare` ejecutado en ambos casos (mismo tiempo) | Pasa |
| Asignación masiva | `role: "ADMIN"` en el registro o en el perfil se descarta | Pasa |
| Exposición de datos | Ninguna respuesta de registro, login o perfil contiene la contraseña ni su hash | Pasa |
| Autorización | El rol se lee de la base en cada petición, no del token; un USER recibe 403 en 5 rutas de administración; un admin no puede quitarse su propio rol ni banear a otro administrador (403, atómico) | Pasa (defecto corregido, ver 1.2) |
| Integridad del token | Un JWT con `alg: none` (sin firma) se rechaza con 401 | Pasa |
| Manejo de errores | JSON malformado → 400 sin detalle interno (antes 500); cuerpo de más de 100 kB → 413 | Pasa (defecto corregido) |
| Cabeceras | Sin `X-Powered-By`; `helmet` (nosniff, `X-Frame-Options`, HSTS, `Referrer-Policy`, CSP); `Cache-Control: no-store` en toda `/api/v1` | Pasa (defecto corregido, ver 1.3) |
| CORS | Sin `FRONTEND_URL`: cualquier origen pero **sin** credenciales; con ella, solo ese origen y con credenciales | Pasa (defecto corregido, ver 1.3) |
| Proxy | Por defecto no se confía en `X-Forwarded-For` (no se puede falsificar la IP) | Pasa |

### 1.1 Hallazgo: no había protección contra fuerza bruta

- **Antes.** 30 contraseñas incorrectas seguidas → 30 respuestas 401; el intento 31
  con la contraseña correcta entraba. Sin límite, un atacante puede probar
  contraseñas indefinidamente, y cada intento consume ~250 ms de CPU por bcrypt.
- **Corrección.** `src/interface/middlewares/login-limiter.middleware.ts` cuenta
  solo los 401, por cuenta (IP + correo, 5 por defecto) y por IP (50). La ventana
  es de 15 minutos y un ingreso correcto borra los fallos de esa cuenta. Se
  configura con `LOGIN_MAX_INTENTOS`, `LOGIN_MAX_INTENTOS_IP`, `LOGIN_VENTANA_MS` y
  `TRUST_PROXY` (activarlo en Vercel, que atiende detrás de un proxy).
- **Limitación.** Los contadores viven en la memoria de cada instancia. En un despliegue
  con varias instancias (serverless) hay que llevarlos a un almacén compartido como
  Redis o Upstash.

## 2. Rendimiento bajo carga

Comando: `npm run test:carga`. Evidencia: `docs/evidencias/rendimiento/resultados-carga.json`.

**Condiciones.** autocannon contra la aplicación Express real, con bcrypt nativo
de costo 12 (el de producción) y la base sustituida por un doble que tarda 5 ms
por consulta, para aislar la aplicación de un Postgres concreto. Se midió en dos
entornos: (1) contenedor Linux de **1 núcleo**, Node 22; (2) **AMD Ryzen 7 4700U,
8 núcleos**, 23 GB, Node 24.16 (equipo del proyecto).

**Métricas.** Peticiones por segundo; latencia p50, p97,5 y máxima; códigos de
respuesta; errores (5xx, de red y timeouts).

| Esc. | Objetivo | Carga | Criterios de aceptación | 1 núcleo: p97,5 / pet./s | 8 núcleos: p97,5 / pet./s | Errores | Resultado |
|---|---|---|---|---|---|---:|---|
| E1 | Catálogo público | 50 conexiones, 10 s | p97,5 ≤ 200 ms; 0 errores; ≥ 300 pet./s | 54 ms / 2.803 | 37 ms / 2.713 | 0 | Cumple en ambos |
| E2 | Login, costo 12 | 10 conexiones, 10 s | p97,5 ≤ 1500 ms; 0 errores; 100 % 200 | 3.029 ms / 4 | 780 ms / 16 | 0 | **No cumple en 1 núcleo**; cumple en 8 |
| E2b | Login, costo 10 | 10 conexiones, 10 s | igual que E2 | 1.002 ms / 15 | 244 ms / 62 | 0 | Cumple en ambos |
| E3 | Panel de alertas (admin) | 50 conexiones, 10 s | p97,5 ≤ 200 ms; 0 errores; 100 % 200 | 71 ms / 1.875 | 55 ms / 1.802 | 0 | Cumple en ambos |
| E4 | Editar perfil | 30 conexiones, 10 s | igual que E3 | 33 ms / 1.882 | 37 ms / 1.349 | 0 | Cumple en ambos |
| E5 | Ataque de fuerza bruta | 20 conexiones, 8 s | ≥ 95 % 429; p97,5 ≤ 100 ms; 0 errores | 39 ms (99,6 % 429) | 7 ms (99,9 % 429) | 0 | Cumple en ambos |

`npm run test:carga` sobrescribe `docs/evidencias/rendimiento/resultados-carga.md`
con la medición del equipo donde se ejecuta.

### Interpretación

- **Las rutas sin bcrypt sobran de capacidad.** Catálogo, alertas y perfil atienden
  de 1.800 a 2.800 peticiones por segundo con p97,5 por debajo de 75 ms. El cuello de
  botella en producción será la base de datos, no la aplicación.
- **El login depende de los núcleos disponibles.** Cada verificación con bcrypt de
  costo 12 cuesta unos 250 ms de CPU. Con 8 núcleos atiende 16 ingresos por segundo
  con un p97,5 de 780 ms (cumple). Con 1 núcleo baja a 4 por segundo y el p97,5 llega
  a 3 s (no cumple). Ninguna petición falló: es un problema de espera, no de errores.
- **El limitador también protege el rendimiento.** Bajo ataque, solo los 5 primeros
  intentos por cuenta llegan a bcrypt. El resto se rechaza en milisegundos, así que
  un ataque no consume la CPU que necesitan los usuarios legítimos.

### 1.2 Hallazgo: la API permitía banear a otro administrador

- **Antes.** `banUser` solo impedía banearse a uno mismo; un administrador podía dejar
  fuera del panel a otro. La pantalla no lo ofrecía, pero la API sí lo aceptaba
  (hallazgo H7.1 de la evaluación heurística).
- **Corrección.** `AdminRepository.banUser` actualiza solo `where { id, role: 'USER' }`,
  en la misma operación (sin ventana entre comprobar el rol y banear). Si no hay fila,
  una consulta distingue: no existe → 404; es administrador → 403
  «No puedes banear a un administrador. Quítale primero el rol de administrador.».
- **Prueba.** `tests/escenarios/esc-26-banear-usuario.test.ts`, Camino 8.

### 1.3 Hallazgo: faltaban cabeceras de seguridad y CORS mezclaba '*' con credenciales

- **Antes.** Solo se quitaba `X-Powered-By`. Las respuestas con tokens se podían guardar
  en caché, y CORS enviaba `origin: '*'` con `credentials: true`, una combinación que
  los navegadores rechazan y que el frontend no necesita (usa la cabecera
  `Authorization`, no cookies).
- **Corrección.** `helmet` 8.3.0 en `src/app.ts`; `Cache-Control: no-store` para
  `/api/v1`; credenciales en CORS solo cuando se declara `FRONTEND_URL`.
- **Prueba.** `tests/seguridad/cabeceras-seguridad.test.ts` (7 pruebas) y, desde el
  frontend, `cypress/api/contrato-y-seguridad.cy.ts`.

### Mejoras propuestas

1. **Costo de bcrypt.** Ya es configurable (`BCRYPT_COST`, de 10 a 14; por defecto
   12). Recomendación: 10 (mínimo de OWASP) en instancias de 1 vCPU, como las
   básicas de Vercel; en máquinas con varios núcleos se puede mantener 12. El costo nuevo solo se aplica a las contraseñas que
   se crean o cambian después.
2. **Limitador compartido.** Mover los contadores a Redis o Upstash si el backend
   corre en varias instancias.
3. **Carga con base real.** Repetir E1, E3 y E4 contra un Postgres de staging (k6 o
   autocannon) para medir el costo de las consultas, que aquí está fijado en 5 ms.
4. **Índices.** `Phone.slug` es único y `Alert` ya tiene índices en `phoneId` e
   `isResolved`. La consulta del panel filtra por `isResolved` y ordena por
   `createdAt`, así que un índice compuesto `@@index([isResolved, createdAt])` le
   ahorraría el ordenamiento. Conviene confirmarlo con `EXPLAIN` en la prueba con
   base real.
