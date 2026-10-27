# ReportPortal — backend de CelularPro

Es el **mismo servidor** que usa el frontend (ver `LEEME.md` de `reportportal/` en CelularPro-front para la
configuración del análisis: tipos de defecto, Auto-Analysis, Pattern Analysis, Unique Errors y ML suggestions).
Aquí está la copia necesaria para que el backend sea autocontenido.

## Arranque (si no está ya levantado por el frontend)

```bash
cd reportportal
docker compose -p reportportal --profile core --profile analyzer up -d
```

Interfaz en <http://localhost:8080> (`superadmin` / `erebus`). Usa el mismo proyecto `celularpro` y la misma API key.

## Qué envía el backend

| Suite | Cómo | Comando | Launch |
|---|---|---|---|
| Unitarias, escenarios de API, regresión, seguridad y rendimiento (426 pruebas) | Agente `@reportportal/agent-js-vitest` 5.1.1 | `npm test` | `CelularPro · api-vitest` |
| Carga con autocannon (criterios de aceptación como aserciones) | Mismo agente | `npm run test:carga` | `CelularPro · api-carga` |
| Contrato de la API con Momentic | JUnit + importación | `cd api-momentic && npm test && npm run rp:importar` | `CelularPro · api-momentic` |

Todo se activa solo con `RP_API_KEY` (ver `.env.example`). Los launches del backend llevan el atributo
`app: celularpro-api` y los del frontend `app: celularpro-front`: en ReportPortal se filtran por separado o juntos.

## Verificación sin Docker

```bash
node reportportal/servidor-simulado.mjs 8089 &
RP_API_KEY=prueba RP_ENDPOINT=http://localhost:8089/api/v1 npx vitest run tests/escenarios/esc-26-banear-usuario.test.ts
curl http://localhost:8089/__registro
```

Verificado: con Vitest 2.1.9 llegan el launch con `app: celularpro-api`, las suites, cada prueba con su estado y el
cierre del launch.
