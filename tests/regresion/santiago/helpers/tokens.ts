/**
 * Tokens maliciosos para security-testing.
 *
 * Los tokens válidos, vencidos y con firma equivocada ya están en
 * tests/helpers/fixtures.ts. Aquí va el que esas fixtures no cubren: un JWT
 * con `alg: "none"`, es decir, sin firma. Es un ataque clásico contra
 * bibliotecas que aceptan el algoritmo que declara el propio token.
 */
const base64url = (objeto: object) =>
  Buffer.from(JSON.stringify(objeto)).toString('base64url')

export function tokenSinFirma(payload: Record<string, unknown>): string {
  const cabecera = base64url({ alg: 'none', typ: 'JWT' })
  const cuerpo = base64url({ ...payload, iat: Math.floor(Date.now() / 1000) })
  // La tercera parte (la firma) va vacía.
  return `${cabecera}.${cuerpo}.`
}

/**
 * Un token armado a mano: dice HS256 y trae un payload creíble, pero la firma
 * es inventada. Es lo que obtiene quien edita el payload de un token real
 * (por ejemplo, para cambiarse el rol) sin conocer el secreto.
 */
export function tokenAlterado(payload: Record<string, unknown>): string {
  const cabecera = base64url({ alg: 'HS256', typ: 'JWT' })
  const cuerpo = base64url({ ...payload, iat: Math.floor(Date.now() / 1000) })
  return `${cabecera}.${cuerpo}.firma-inventada`
}
