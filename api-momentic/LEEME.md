# Momentic — contrato de la API

Pruebas de contrato de la API con el paso `request` de Momentic y validaciones en JavaScript.
Complementan las pruebas de Vitest: mismas reglas, ejecutadas contra el servidor real y desde la herramienta.

```bash
cd api-momentic
npm install
npm run lint && npm run check         # ya pasan, no necesitan clave
npx momentic install-browsers chromium   # la primera vez: el navegador de Momentic
MOMENTIC_API_KEY=... API_URL=http://localhost:3001/api/v1 npm test   # backend levantado y con seed
npm run rp:importar                    # a ReportPortal
```

Una prueba por cada una de las 6 funcionalidades:

| Prueba | Funcionalidad | Qué valida |
|---|---|---|
| `01-registro-de-usuario` | Registro de usuario | 201 con token, rol USER, nombre guardado y sin contraseña en la respuesta |
| `02-inicio-de-sesion` | Inicio de sesión | El administrador recibe un token y `/auth/me` lo identifica, sin contraseña |
| `03-gestion-de-perfil` | Gestión de perfil | `PATCH /auth/me` cambia el nombre e ignora `role` y `email` (asignación masiva) |
| `04-validacion-de-credenciales` | Validación de credenciales | El correo se guarda en minúsculas, se puede entrar escribiéndolo en mayúsculas y la respuesta lleva `no-store` y `nosniff` |
| `05-control-de-roles` | Control de roles | El administrador entra a `/admin/users`; un registro que pide `role: ADMIN` queda como USER |
| `06-alertas-de-stock-bajo` | Alertas de stock bajo | Solo alertas abiertas, de tipo `LOW_STOCK` u `OUT_OF_STOCK`, con su celular |

**Importante:** cada `request` que envía un cuerpo JSON lleva la cabecera `Content-Type: application/json`.
Sin ella el backend no interpreta el cuerpo y responde 400 (`email: Required`, `password: Required`).

## Limitación verificada: solo respuestas 2xx

El paso `request` de Momentic **falla si la respuesta no es 2xx** (comprobado en el ejecutor del CLI: lanza
«Fetch request failed with status …»). Por eso aquí solo hay contratos positivos. Los casos negativos de la API
(401, 403, 400, 409, 429) siguen en Vitest (`tests/escenarios`, `tests/seguridad`) y en el Cypress del frontend.

La respuesta guardada con `saveAs` tiene `status`, `headers` (nombres en minúscula), `request` y `json` o `text`.
Dentro del código JavaScript se lee con `env.NOMBRE`; en los campos de texto, con `{{ env.NOMBRE }}`.
