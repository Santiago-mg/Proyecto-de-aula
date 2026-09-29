/**
 * Chai no trae aserciones para promesas (eso lo agrega el plugin
 * chai-as-promised). En vez de sumar otra dependencia, esta función espera la
 * promesa que DEBE fallar y devuelve el error, para revisarlo con chai:
 *
 *   const error = await capturarError(loginUser(repo, datos))
 *   expect(error).to.be.instanceOf(AppError).and.include({ statusCode: 401 })
 *
 * Si la promesa termina bien, la prueba falla con un mensaje claro.
 */
export async function capturarError(promesa: Promise<unknown>): Promise<unknown> {
  try {
    await promesa
  } catch (error) {
    return error
  }
  throw new Error('Se esperaba que la operación fallara, pero terminó bien')
}
