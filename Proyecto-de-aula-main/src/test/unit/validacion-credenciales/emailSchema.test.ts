/**
 * Basado en el diagrama de flujo/grafo:
 *   Proceso 4. Validación de credenciales — Escenario B
 *   Fuente real: src/application/dtos/auth.dto.ts — emailSchema
 *                (no se exporta directamente; se prueba a través de registerDto,
 *                que usa emailSchema como campo `email`)
 *
 * Caminos cubiertos:
 *   1,2,3,4,F       -> formato inválido            -> 'Correo electrónico inválido'
 *   1,2,3,5,6,7,F   -> formato válido, dominio no permitido -> mensaje de dominio
 *   1,2,3,5,6,8,F   -> formato válido, dominio permitido    -> válido
 */
import { describe, it, expect } from 'vitest'
import { registerDto } from '../../../src/application/dtos/auth.dto'

const validRest = { name: 'Ana López', password: 'password123' }

describe('emailSchema (a través de registerDto) — Validación de dominio de correo', () => {
  it("Camino 1,2,3,4,F — formato inválido ('usuarsio@'): falla con 'Correo electrónico inválido'", () => {
    const result = registerDto.safeParse({ email: 'usuario@', ...validRest })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.issues.find((i) => i.path[0] === 'email')
      expect(emailError?.message).toBe('Correo electrónico inválido')
    }
  })

  it("Camino 1,2,3,5,6,7,F — formato válido, dominio no permitido ('user@empresa.com'): falla", () => {
    const result = registerDto.safeParse({ email: 'user@empresa.com', ...validRest })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.issues.find((i) => i.path[0] === 'email')
      expect(emailError?.message).toContain('Usa Gmail, Outlook, Hotmail, Yahoo o iCloud')
    }
  })

  it("Camino 1,2,3,5,6,8,F — formato válido, dominio permitido ('user@gmail.com'): pasa", () => {
    const result = registerDto.safeParse({ email: 'user@gmail.com', ...validRest })
    expect(result.success).toBe(true)
  })

  it('normaliza el correo a minúsculas y sin espacios (trim + toLowerCase)', () => {
    const result = registerDto.safeParse({ email: '  USER@GMAIL.COM  ', ...validRest })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('user@gmail.com')
    }
  })

  it.each(['outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'])(
    'acepta el dominio permitido %s',
    (domain) => {
      const result = registerDto.safeParse({ email: `user@${domain}`, ...validRest })
      expect(result.success).toBe(true)
    },
  )
})
