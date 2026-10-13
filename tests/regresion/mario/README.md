# Regresión de Mario (back)

Pruebas traídas del proyecto de Mario y adaptadas a este repositorio. Son del
estilo "valor fijado": cada una clava un número o un mensaje del que depende el
negocio, para que un refactor que lo cambie sin querer falle con un nombre que
dice qué regla se rompió.

```bash
npm run test:regresion:mario   # 11 pruebas, no necesita Postgres
```

## Qué verifica `regresion.test.ts`

| Función | Prueba | Regla que protege |
|---|---|---|
| 13 | `afinidad_maxima_es_6_puntos` | Dos celulares con misma marca, categoría y precio puntúan 6 |
| 13 | `margen_de_precio_equivalente_es_25_por_ciento` | Rango de precio de los "similares": ±25 % |
| 13 | `limite_de_recomendaciones_recorta_la_lista` | El parámetro de límite corta la lista |
| 14 | `stock_igual_al_minimo_dispara_low_stock` | Stock = mínimo ya es alerta |
| 14 | `stock_en_cero_dispara_out_of_stock...` | Stock 0 es "agotado", no "bajo" |
| 14 | `stock_por_encima_del_minimo_no_dispara...` | Sin alerta si hay más del mínimo |
| 22 | `envio_gratis_a_partir_de_500_001` | Envío gratis si el subtotal supera 500.000 |
| 22 | `envio_tiene_costo_en_el_umbral_exacto...` | En 500.000 exactos el envío cuesta 20.000 |
| 25 | `pedido_entregado_es_un_estado_terminal` | Un pedido entregado no cambia de estado |
| 21/26 | `mensaje_exacto_al_intentar_banearse...` | Un admin no puede banearse a sí mismo, y el texto del error ("No puedes banear tu propia cuenta") es el que ve en el aviso del front |
| 21/26 | `mensaje_exacto_al_intentar_cambiarse_el_rol...` | Ni cambiarse el rol a sí mismo ("No puedes cambiar tu propio rol") |

## Cómo se verificó que prueban lo correcto

Se rompió a propósito cada regla en una copia del código (no en este
repositorio) y se corrió la carpeta. **8 de 8 cambios fueron detectados**:

| Cambio hecho al código | ¿Falló alguna prueba? |
|---|:-:|
| Margen de precio 0,25 → 0,30 | Sí |
| Quitar el peso de la marca en la afinidad | Sí |
| Stock igual al mínimo deja de disparar alerta | Sí |
| Stock 0 deja de ser agotado | Sí |
| Envío gratis desde 500.001 → desde 500.000 | Sí |
| Costo de envío 20.000 → 25.000 | Sí |
| `DELIVERED` deja de ser estado final | Sí |
| Permitir que un admin se banee a sí mismo | Sí |

## Lo que está en `pendiente-codigo-de-mario/`

`regresion-credenciales.test.ts` tiene 9 pruebas que **no pueden pasar en este
back** porque verifican funciones que solo existen en el proyecto de Mario:

- `src/domain/credenciales.ts` (lista de dominios de correo permitidos y
  política de contraseñas de 8 a 72 caracteres).
- Que el login acepte el correo en mayúsculas.
- Que un JSON malformado responda 400 y no 500.
- Los endpoints de perfil `PATCH /auth/me` y `PUT /auth/me/password`.

Están separadas y excluidas de `npm test` para no dejar la suite en rojo ni
copiar código de producción sin que el equipo lo decida. Con el código de
Mario, esas 9 pasan (se comprobó en una copia). Ver el comando en
`npm run test:regresion:mario:pendiente`.

**Por qué no se trajo el código de Mario:** ambos proyectos nacieron del mismo
trabajo de clase pero cada uno cambió cosas. Al poner el `src` de Mario encima
de este, sus pruebas pasan pero **se rompen 16 pruebas de este back**. Traerlo
exige elegir qué conservar de cada lado.
