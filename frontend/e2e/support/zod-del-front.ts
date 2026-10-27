/**
 * Las dependencias de Serenity/JS instalan su propia copia de Zod en
 * e2e/node_modules, de otra versión mayor. La API simulada combina sus
 * esquemas con los de src/validation/credenciales.ts, así que debe usar la
 * MISMA copia que el frontend; mezclar dos versiones rompe los tipos y
 * produce errores de validación con otra forma.
 */
export { z } from '../../node_modules/zod'
