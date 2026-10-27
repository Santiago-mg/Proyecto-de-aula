# Herramientas de pruebas con IA en el backend

El frontend (CelularPro-front) tiene la integración completa de Autify Nexus, Momentic y ReportPortal; ver su
`HERRAMIENTAS-IA.md`. En el backend se aplica lo que corresponde a una API:

| Herramienta | En el backend | Carpeta |
|---|---|---|
| ReportPortal | Las 426 pruebas de Vitest y la carga con autocannon se reportan con el agente oficial; los contratos de Momentic se importan como JUnit | `reportportal/` |
| Momentic | 5 pruebas de contrato de la API con el paso `request` (lint y checks aprobados) | `api-momentic/` |
| Autify Nexus | No aplica de forma directa: es una herramienta de E2E sobre interfaz web. Sus 18 escenarios del frontend recorren este backend de punta a punta (registro, login, perfil, roles, alertas) | — |

## Cambios de seguridad hechos junto con la integración

- **Banear a un administrador → 403**, de forma atómica (`AdminRepository.banUser`). Antes la API lo permitía.
- **Cabeceras de seguridad** con `helmet` y `Cache-Control: no-store` en `/api/v1`.
- **CORS** sin mezclar `'*'` con credenciales.

Detalle y pruebas en `docs/pruebas/02-seguridad-rendimiento.md` (hallazgos 1.2 y 1.3).

## Qué no se verificó aquí

La ejecución real de Momentic (necesita `MOMENTIC_API_KEY` y navegador) y el análisis real de ReportPortal
(necesita Docker). Lo demás —suite completa, typecheck, agente de ReportPortal contra el servidor simulado y
`momentic lint`— sí se verificó.
