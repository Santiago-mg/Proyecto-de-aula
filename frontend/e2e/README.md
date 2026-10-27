# Pruebas E2E de CelularPro

Serenity/JS + Cucumber (Gherkin en español) + Playwright, con el patrón
**Screenplay**. Es un proyecto aparte del frontend para que sus dependencias
no entren al build de producción.

26 escenarios sobre las seis funcionalidades:

| Característica | Archivo | Escenarios |
|---|---|---:|
| Registro de usuario | `features/registro.feature` | 2 |
| Inicio de sesión | `features/inicio-sesion.feature` | 3 |
| Validación de credenciales | `features/validacion-credenciales.feature` | 8 |
| Gestión de perfil | `features/gestion-perfil.feature` | 4 |
| Control de roles | `features/control-roles.feature` | 4 |
| Alerta de stock bajo | `features/alerta-stock.feature` | 5 |

## Ejecutar

Requiere Node 22 o 24 y las dependencias del frontend instaladas (`npm ci` en
la carpeta superior), porque las pruebas compilan el frontend.

```powershell
cd e2e
npm ci
npx playwright install chromium
npm test
```

`npm test` limpia los reportes, compila el frontend contra la API simulada y
ejecuta todos los escenarios. Por funcionalidad:

```powershell
npm run test:registro
npm run test:inicio-sesion
npm run test:gestion-perfil
npm run test:validacion-credenciales
npm run test:control-roles
npm run test:alerta-stock
npm run test:smoke         # un escenario por funcionalidad
npm run test:report        # abre el reporte HTML de Serenity
```

Con el navegador visible: `$env:HEADLESS="false"; npm test` (PowerShell) o
`HEADLESS=false npm test` (Linux/macOS).

## Dos modos

**Simulado (por defecto).** `support/api-simulada.ts` levanta una API en
memoria en el puerto 3101 con los mismos endpoints, códigos de estado y
mensajes que el backend. Las reglas de credenciales no están copiadas: importa
`src/validation/credenciales.ts`. El frontend compilado se sirve en el puerto
4174. No necesita Postgres, así que corre igual en cualquier equipo y en el
pipeline. Cada escenario empieza con la API recién sembrada.

**Real.** Prueba la integración completa contra el backend:

```powershell
# Terminal 1 — backend con la base sembrada (npm run db:seed)
cd Proyecto-de-aula-mario; npm run dev

# Terminal 2 — frontend apuntando al backend
cd Proyecto-de-aula-mario\frontend; npm run dev

# Terminal 3
cd Proyecto-de-aula-mario\frontend\e2e
$env:E2E_FRONT_URL="http://localhost:5173"
$env:E2E_API_URL="http://localhost:3001/api/v1"
npm run test:real
```

En modo real los escenarios crean cuentas con correos únicos
(`nombre.e2e.<número>@gmail.com`) y no borran nada. Los de alertas cambian el
stock y el mínimo del celular `iphone-13-usado` del seed. Después de correr la
suite, restablézcalo desde el formulario del panel de administración. Variables opcionales: `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`,
`E2E_SLUG_CELULAR`.

## Estructura (Screenplay)

```
features/                   Gherkin: qué se prueba, en lenguaje de negocio
  step-definitions/         Traducen cada paso a tareas de un actor
  support/serenity.config.ts  Arranque: servidores, navegador y actores
screenplay/
  ui/Paginas.ts             Elementos de la interfaz (por id, rol o data-testid)
  tasks/Tareas.ts           Tareas en el navegador: Registrarse, IniciarSesion…
  tasks/Api.ts              Preparación de datos por la API (los "Dado que…")
  questions/Preguntas.ts    Lo que el actor puede observar
support/                    API simulada, servidor del frontend, configuración
katalon/                    Suite de Katalon Recorder y su intérprete
```

Los actores tienen dos habilidades: **BrowseTheWebWithPlaywright** (usar el
navegador) y **CallAnApi** (preparar datos por la API, para no repetir por la
interfaz lo que no se está probando).

## Notas

- Los elementos se localizan por `id`, `role` o `data-testid`, nunca por
  clases de estilo. El frontend agregó `role="alert"` y `data-testid` a los
  mensajes de error, y `data-alertas-cargadas` al panel de administración:
  sin este último, comprobar que **no** hay una alerta podría pasar antes de
  que llegue la respuesta del servidor.
- Algunos textos se ven en mayúsculas por CSS (`text-transform`); esas
  comparaciones no distinguen mayúsculas.
- `CHROMIUM_PATH` permite usar un Chromium ya instalado si la red no deja
  descargar el de Playwright.

## Defectos que encontraron estas pruebas

Al construir la suite aparecieron tres defectos del frontend, ya corregidos y
cubiertos también por pruebas unitarias:

1. La sesión se perdía si la página se recargaba justo después de ingresar
   (`AuthContext` guardaba en `localStorage` dentro de un `useEffect`).
2. El 403 de una cuenta suspendida, en el propio login, recargaba la página
   en vez de mostrar el motivo en el formulario.
3. El formulario de celulares no permitía configurar el stock mínimo de la
   alerta, aunque el backend lo soportaba.
