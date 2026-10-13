# Informe de rendimiento y seguridad — API de CelularPro

Alcance: funcionalidades ESC-13, 26, 27, 28, 29 y 30. Las pruebas están en
`tests/regresion/santiago/performance-testing` y
`tests/regresion/santiago/security-testing` y se corren con
`npm run test:regresion:santiago`.

## 1. Resultado de la corrida

| Categoría | Pruebas | Resultado |
|---|---:|---|
| Regresión funcional | 66 | todas pasan |
| API | 76 | todas pasan |
| Rendimiento | 41 | todas pasan |
| Seguridad | 103 | todas pasan |
| **Total regresión** | **286** | **286 pasan** |

La suite completa del back (`npm test`) tiene 575 pruebas, todas en verde, con
100 % de cobertura de líneas, ramas y funciones sobre `src/`.

## 2. Rendimiento

**Cómo se mide.** Igual que en el ejemplo del curso: una línea base de
corrección, un presupuesto de tiempo amplio (500 ms) y la comparación de dos
implementaciones con la mediana de cinco mediciones. La base de datos es un
doble (`prismaMock`), así que los tiempos son los del código de la API
(rutas, validación, casos de uso y ordenamiento), no los de Postgres.

**Condiciones de carga definidas**

| Escenario | Carga | Resultado |
|---|---|---|
| ESC-13 recomendaciones | ordenar 20.000 candidatos | dentro del presupuesto de 500 ms |
| ESC-13 recomendaciones | endpoint con 48 candidatos | 2 consultas, sin patrón N+1 |
| ESC-28 usuarios | tabla de 5.000 filas | la página nunca pide más de 50 |
| ESC-29 estadísticas | 10.000 pedidos en la semana | ~50 ms |
| ESC-30 catálogo | celular con 200 características, 20 fotos y 10 colores | dentro del presupuesto |

**Qué se concluye**

- Ninguna operación se acerca al presupuesto. La más lenta de las pruebas
  de comparación (panel de estadísticas, cinco repeticiones de dos variantes)
  tarda poco más de un segundo en total.
- Las decisiones de diseño que importan están protegidas con pruebas
  deterministas, que no dependen de la velocidad de la máquina: el panel hace
  exactamente 11 consultas agrupadas en tandas paralelas, los 7 días de
  ingresos salen de una sola consulta, el listado de usuarios consulta el
  conteo y la página a la vez, y cada candidato se puntúa una sola vez.
- Si alguien reemplaza una de esas soluciones por una versión más simple pero
  más lenta (por ejemplo, un `await` tras otro), la prueba falla.

**Límites de lo medido.** No se midió contra Postgres real ni con usuarios
concurrentes. Los números sirven para detectar regresiones del código, no
como promesa de latencia en producción.

## 3. Seguridad

**Controles verificados**

- Autenticación: seis credenciales inválidas devuelven 401 (sin cabecera,
  esquema Basic en vez de Bearer, token firmado con otro secreto, token vencido,
  token sin firma `alg: none` y token alterado a mano).
- Autorización: un usuario con rol USER recibe 403; un token que dice ADMIN
  pero cuya cuenta en la base es USER también (escalada de privilegios); un
  administrador baneado también.
- Un baneo surte efecto de inmediato: el token que el usuario ya tenía deja de
  servir.
- Entrada: los límites de paginación rechazan volcados del catálogo
  (`limit=1000` devuelve 400 sin consultar la base).
- Asignación masiva: aunque el cuerpo de la petición pida más campos, solo se
  modifican los permitidos.
- Datos sensibles: ni la contraseña ni su hash viajan en las respuestas.
- Errores internos en producción: un fallo de la base no filtra nombres de
  tablas ni restricciones al cliente.

## 4. Hallazgos y mejoras propuestas

Revisado en el código de `src/` (no están implementadas, son propuestas):

| # | Hallazgo | Riesgo | Mejora propuesta |
|---|---|---|---|
| 1 | No hay limitación de intentos (no se usa `express-rate-limit`) en el login. | Medio: permite fuerza bruta de contraseñas. | Limitar intentos por IP y por correo en `/auth/login`. |
| 2 | No se usa `helmet`; solo hay `cors`. | Bajo: faltan cabeceras de seguridad estándar. | Agregar `helmet()` en `app.ts`. |
| 3 | El token dura 7 días por defecto (`JWT_EXPIRES_IN`). | Bajo/medio: un token robado sirve una semana. | Acortar la duración y renovar con un token de refresco. |
| 4 | La contraseña solo exige 8 caracteres. | Bajo: admite claves débiles como `12345678`. | Exigir mayúscula, minúscula, número y símbolo, como en la política del ejemplo del curso. |
| 5 | El rendimiento solo se midió con la base simulada. | Informativo. | Repetir las mediciones contra Postgres con datos del seed y con peticiones concurrentes. |

## 5. Cómo reproducirlo

```bash
npm run test:regresion                 # las cuatro categorías
npm run test:regresion:performance     # solo rendimiento
npm run test:regresion:seguridad       # solo seguridad
npm run test:coverage                  # suite completa con cobertura
```
