# Pruebas de regresión del back — por autor

Cada persona del equipo tiene su propia carpeta. Los comandos de una carpeta
corren **solo** las pruebas de esa carpeta, así que nadie ejecuta por error lo
de otro.

| Carpeta | Autor | Qué cubre | Pruebas | Comando |
|---|---|---|---:|---|
| [`santiago/`](santiago/README.md) | Santiago | Funcionalidades 13, 26–30 en cuatro categorías: funcional, API, rendimiento y seguridad | 286 | `npm run test:regresion:santiago` |
| [`mario/`](mario/README.md) | Mario | Funcionalidades 13, 14, 21, 22, 25 y 26: números y mensajes que el negocio no debe perder | 11 | `npm run test:regresion:mario` |
| `mario/pendiente-codigo-de-mario/` | Mario | Reglas de credenciales y perfil de usuario (código que este back aún no tiene) | 9 | `npm run test:regresion:mario:pendiente` (falla a propósito) |

`npm run test:regresion` corre Santiago y después Mario. `npm test` corre toda
la suite del back (586 pruebas) y **no** incluye la carpeta pendiente.

## Cómo comprobar que cada autor corre solo lo suyo

```bash
npm run test:regresion:santiago   # debe terminar con "Total: 286 passed"
npm run test:regresion:mario      # debe decir "Tests 11 passed (11)"
```

## Reglas para agregar pruebas de otra persona

1. Una carpeta por autor: `tests/regresion/<nombre>/`.
2. Los imports de `src/` se ajustan a la profundidad de la carpeta
   (`../../../src/...`). Los dobles compartidos están en `tests/helpers/`.
3. Si la prueba espera código que este back no tiene, no se copia código de
   producción a escondidas: la prueba va a una subcarpeta `pendiente-*`, se
   excluye de `vitest.config.ts` y el README del autor dice qué falta.
4. Antes de dar una prueba por buena se rompe a propósito la regla que dice
   cuidar (mutación) y se comprueba que la prueba falla. Una prueba que nunca
   falla no protege nada.
