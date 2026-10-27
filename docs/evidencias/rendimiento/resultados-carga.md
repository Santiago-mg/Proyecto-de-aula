# Resultados de carga — 2026-10-12T22:38:39.508Z

Entorno: Node v22.22.2, Intel(R) Xeon(R) Processor @ 2.80GHz (1 núcleos, 4 GB), base simulada con 5 ms por consulta, bcrypt nativo, costo 12.

| Esc. | Petición | Conexiones / duración | Peticiones | Pet./s | p50 ms | p97,5 ms | máx ms | Códigos | Errores | Resultado |
|---|---|---|---:|---:|---:|---:|---:|---|---:|---|
| E1 | GET /api/v1/phones?page=1&limit=12 | 50 / 10 s | 27098 | 2710 | 15 | 52 | 424 | 200: 27098 | 0 | Cumple |
| E2 | POST /api/v1/auth/login (credenciales correctas) | 10 / 10 s | 36 | 4 | 2087 | 3163 | 3163 | 200: 36 | 0 | No cumple |
| E2b | POST /api/v1/auth/login (hash con costo 10) | 10 / 10 s | 150 | 15 | 707 | 995 | 1050 | 200: 150 | 0 | Cumple |
| E3 | GET /api/v1/admin/alerts (token de administrador) | 50 / 10 s | 17184 | 1719 | 23 | 80 | 858 | 200: 17184 | 0 | Cumple |
| E4 | PATCH /api/v1/auth/me | 30 / 10 s | 19400 | 1940 | 13 | 31 | 95 | 200: 19400 | 0 | Cumple |
| E5 | POST /api/v1/auth/login (contraseña incorrecta, misma cuenta) | 20 / 8 s | 6817 | 852 | 4 | 38 | 5939 | 401: 24, 429: 6793 | 0 | Cumple |

## Criterios de aceptación

- **E1 Catálogo público:** p97,5 ≤ 200 ms → cumple; 0 errores (5xx, de red o timeouts) → cumple; ≥ 300 peticiones/s → cumple
- **E2 Inicio de sesión:** p97,5 ≤ 1500 ms (informativo) → NO cumple; 0 errores (5xx, de red o timeouts) → cumple; 100 % de respuestas 200 → cumple
- **E2b Inicio de sesión, costo 10:** p97,5 ≤ 1500 ms → cumple; 0 errores (5xx, de red o timeouts) → cumple; 100 % de respuestas 200 → cumple
- **E3 Panel de alertas de stock:** p97,5 ≤ 200 ms → cumple; 0 errores (5xx, de red o timeouts) → cumple; 100 % de respuestas 200 → cumple
- **E4 Edición de perfil:** p97,5 ≤ 200 ms → cumple; 0 errores (5xx, de red o timeouts) → cumple; 100 % de respuestas 200 → cumple
- **E5 Fuerza bruta con limitador:** ≥ 95 % de respuestas 429 → cumple; p97,5 ≤ 100 ms (los 429 no ejecutan bcrypt) → cumple; 0 errores (5xx, de red o timeouts) → cumple
