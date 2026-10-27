import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../../src/app'
import { registerDto } from '../../../src/application/dtos/auth.dto'
import { DOMINIOS_PERMITIDOS, PASSWORD_MAX, PASSWORD_MIN } from '../../../src/domain/credenciales'
import { evaluarAlerta } from '../../../src/domain/stock-alerts'
import { prismaMock } from '../../helpers/prisma-mock'
import { autenticar, usuario } from '../../helpers/fixtures'

/**
 * Regresión de las seis funcionalidades y de los defectos corregidos en esta
 * versión. Cada nombre dice qué regla protege: si un cambio la rompe, el
 * reporte lo dice sin necesidad de abrir el archivo.
 */

describe('Regresión — defectos corregidos', () => {
  it('regresion_login_con_mayusculas_en_el_correo_encuentra_la_cuenta', async () => {
    // Antes: el registro del front guardaba en minúsculas pero el login
    // buscaba lo escrito tal cual → 401 con la contraseña correcta.
    const u = usuario({ email: 'ana@gmail.com', password: 'Password123' })
    prismaMock.user.findUnique.mockImplementation(
      async ({ where }: { where: { email: string } }) => (where.email === u.email ? u : null),
    )

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: '  Ana@Gmail.COM ', password: 'Password123' })

    expect(res.status).toBe(200)
  })

  it('regresion_el_backend_aplica_la_lista_de_dominios_del_frontend', async () => {
    // Antes: el formulario rechazaba user@empresa.com pero la API lo aceptaba.
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'user@empresa.com', name: 'Usuario', password: 'Password123' })

    expect(res.status).toBe(400)
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })

  it('regresion_el_backend_exige_la_politica_de_contrasenas', async () => {
    // Antes: "aaaaaaaa" era una contraseña aceptada.
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'ana@gmail.com', name: 'Ana', password: 'aaaaaaaa' })

    expect(res.status).toBe(400)
  })

  it('regresion_json_malformado_responde_400_y_no_500', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{')

    expect(res.status).toBe(400)
  })

  it('regresion_existen_los_endpoints_de_gestion_de_perfil', async () => {
    // Antes: PATCH /auth/me y PUT /auth/me/password respondían 404.
    const { token } = autenticar()

    const perfil = await request(app).patch('/api/v1/auth/me').set('Authorization', `Bearer ${token}`).send({})
    const clave = await request(app).put('/api/v1/auth/me/password').set('Authorization', `Bearer ${token}`).send({})

    expect(perfil.status).toBe(400)
    expect(clave.status).toBe(400)
  })
})

describe('Regresión — valores de negocio fijados', () => {
  it('regresion_dominios_permitidos_son_cinco', () => {
    expect(DOMINIOS_PERMITIDOS).toEqual(['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'])
  })

  it('regresion_longitud_de_contrasena_entre_8_y_72', () => {
    expect([PASSWORD_MIN, PASSWORD_MAX]).toEqual([8, 72])
  })

  it('regresion_nombre_minimo_de_2_caracteres', () => {
    expect(registerDto.safeParse({ email: 'a@gmail.com', name: 'A', password: 'Password123' }).success).toBe(false)
    expect(registerDto.safeParse({ email: 'a@gmail.com', name: 'Al', password: 'Password123' }).success).toBe(true)
  })

  it('regresion_minstock_por_defecto_5_dispara_alerta_con_5_unidades', () => {
    // prisma/schema.prisma: minStock Int @default(5)
    expect(evaluarAlerta(5, 5)).toBe('LOW_STOCK')
    expect(evaluarAlerta(6, 5)).toBeNull()
  })
})
