import request from 'supertest'
import app from '../../../../src/app'
import { prismaMock } from '../../../helpers/prisma-mock'
import {
  ID_INEXISTENTE,
  autenticar,
  autenticarAdmin,
  generarToken,
  tokenConFirmaInvalida,
  tokenExpirado,
  usuario,
} from '../../../helpers/fixtures'
import { tokenAlterado, tokenSinFirma } from './tokens'

/**
 * Matriz de control de acceso para security-testing.
 *
 * Las funcionalidades 26 a 30 son del panel de administración: todas deben
 * rechazar exactamente los mismos intentos. En vez de copiar las mismas siete
 * pruebas en cada archivo, cada uno declara su endpoint y recorre estas dos
 * tablas con it.each (el equivalente de @pytest.mark.parametrize).
 */

export type Metodo = 'get' | 'post' | 'put' | 'delete'

export interface Endpoint {
  metodo: Metodo
  ruta: string
  body?: object
}

/** Envía la petición del endpoint con la cabecera Authorization indicada. */
export function enviar(endpoint: Endpoint, authorization?: string) {
  let peticion = request(app)[endpoint.metodo](endpoint.ruta)
  if (authorization !== undefined) {
    peticion = peticion.set('Authorization', authorization)
  }
  return endpoint.body ? peticion.send(endpoint.body) : peticion
}

// Todos los tokens inválidos dicen ser de este administrador. ID_INEXISTENTE
// es el mismo id que usa tokenConFirmaInvalida() en las fixtures generales.
const ADMIN_DE_LOS_TOKENS = { id: ID_INEXISTENTE, role: 'ADMIN' }

/**
 * Programa en la base un administrador activo con el id de los tokens de
 * CREDENCIALES_INVALIDAS. Va en el Arrange de cada prueba 401: si la base no
 * lo tuviera, auth.middleware respondería 401 por "usuario no existe" aunque
 * alguien hubiera quitado la verificación de la firma, y la prueba pasaría
 * igual. Con el administrador presente, el 401 solo puede venir del token.
 */
export function existeElAdminDeLosTokens() {
  prismaMock.user.findUnique.mockResolvedValue(
    usuario({ id: ADMIN_DE_LOS_TOKENS.id, role: 'ADMIN' }),
  )
}

/** Credenciales que nunca deben abrir un endpoint protegido: todas → 401. */
export const CREDENCIALES_INVALIDAS: Array<[string, string | undefined]> = [
  ['sin cabecera Authorization', undefined],
  ['esquema Basic en lugar de Bearer', 'Basic YWRtaW46YWRtaW4='],
  ['token firmado con otro secreto', `Bearer ${tokenConFirmaInvalida()}`],
  ['token vencido', `Bearer ${tokenExpirado(ADMIN_DE_LOS_TOKENS)}`],
  ['token sin firma (alg: none)', `Bearer ${tokenSinFirma(ADMIN_DE_LOS_TOKENS)}`],
  ['token alterado a mano (firma inventada)', `Bearer ${tokenAlterado(ADMIN_DE_LOS_TOKENS)}`],
]

/**
 * Sesiones con un token auténtico que aun así no tienen permiso de
 * administrador: todas → 403. Cada una programa el doble con la fila que
 * auth.middleware lee de la base en cada petición.
 */
export const SESIONES_SIN_PERMISO: Array<[string, () => string, RegExp]> = [
  [
    'usuario con rol USER',
    () => `Bearer ${autenticar().token}`,
    /^Acceso restringido a administradores$/,
  ],
  [
    'token que dice ADMIN pero la base dice USER (escalada de privilegios)',
    () => {
      const fila = usuario({ role: 'USER' })
      prismaMock.user.findUnique.mockResolvedValue(fila)
      return `Bearer ${generarToken({ id: fila.id, role: 'ADMIN' })}`
    },
    /^Acceso restringido a administradores$/,
  ],
  [
    'administrador baneado',
    () => `Bearer ${autenticarAdmin({ banned: true, banReason: 'cuenta comprometida' }).token}`,
    /^Tu cuenta ha sido suspendida\. Motivo: cuenta comprometida$/,
  ],
]
