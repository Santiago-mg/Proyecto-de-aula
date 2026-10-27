import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  AYUDA_PASSWORD,
  cambioPasswordSchema,
  perfilSchema,
  type CambioPasswordForm,
  type PerfilForm,
} from '../validation/credenciales'

const ROL_LABEL = { USER: 'Cliente', ADMIN: 'Administrador' } as const

const seccion: React.CSSProperties = {
  border: '1px solid var(--line)',
  borderRadius: 16,
  padding: 28,
}

const tituloSeccion: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 22,
  fontWeight: 400,
  letterSpacing: '-0.02em',
  margin: '0 0 6px',
}

/**
 * Gestión de perfil: ver los datos de la cuenta, cambiar el nombre y cambiar
 * la contraseña. El correo y el rol se muestran pero no se editan aquí: el
 * correo es la identidad de la cuenta y el rol lo asigna un administrador.
 */
export function Profile() {
  const { user, updateProfile, changePassword } = useAuth()
  const { showToast } = useToast()

  const [errorPerfil, setErrorPerfil] = useState<Error | null>(null)
  const [errorPassword, setErrorPassword] = useState<Error | null>(null)
  const [passwordCambiada, setPasswordCambiada] = useState(false)

  const perfil = useForm<PerfilForm>({
    resolver: zodResolver(perfilSchema),
    defaultValues: { name: user?.name ?? '' },
  })

  const clave = useForm<CambioPasswordForm>({
    resolver: zodResolver(cambioPasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  if (!user) return null

  async function guardarNombre(data: PerfilForm) {
    setErrorPerfil(null)
    try {
      await updateProfile(data.name)
      perfil.reset({ name: data.name })
      showToast('Nombre actualizado')
    } catch (err) {
      setErrorPerfil(err instanceof Error ? err : new Error(String(err)))
    }
  }

  async function guardarPassword(data: CambioPasswordForm) {
    setErrorPassword(null)
    setPasswordCambiada(false)
    try {
      await changePassword(data.currentPassword, data.newPassword)
      clave.reset()
      setPasswordCambiada(true)
      showToast('Contraseña actualizada')
    } catch (err) {
      setErrorPassword(err instanceof Error ? err : new Error(String(err)))
    }
  }

  const e1 = perfil.formState.errors
  const e2 = clave.formState.errors

  return (
    <div className="cp-container" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 720 }}>
      <div style={{ marginBottom: 40 }}>
        <Link to="/dashboard" className="cp-link" style={{ fontSize: 13 }}>
          Volver a mis pedidos
        </Link>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 40,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            margin: '16px 0 0',
          }}
        >
          Mi perfil
        </h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Datos de la cuenta */}
        <section style={seccion} aria-labelledby="titulo-datos">
          <h2 id="titulo-datos" style={tituloSeccion}>
            Datos de la cuenta
          </h2>
          <dl style={{ margin: '0 0 20px', color: 'var(--ink-soft)', fontSize: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <dt>Correo:</dt>
              <dd style={{ margin: 0 }} data-testid="perfil-email">
                {user.email}
              </dd>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <dt>Tipo de cuenta:</dt>
              <dd style={{ margin: 0 }} data-testid="perfil-rol">
                {ROL_LABEL[user.role]}
              </dd>
            </div>
          </dl>

          <form onSubmit={perfil.handleSubmit(guardarNombre)} noValidate>
            <div className="cp-field">
              <label htmlFor="profile-name" className="cp-label">
                Nombre completo
              </label>
              <input
                id="profile-name"
                type="text"
                autoComplete="name"
                className={`cp-input ${e1.name ? 'error' : ''}`}
                aria-invalid={e1.name ? true : undefined}
                aria-describedby={e1.name ? 'profile-name-error' : undefined}
                {...perfil.register('name')}
              />
              {e1.name && (
                <p id="profile-name-error" className="cp-field-error" role="alert">
                  {e1.name.message}
                </p>
              )}
            </div>

            {errorPerfil && <ErrorMessage error={errorPerfil} />}

            <button
              type="submit"
              className="cp-btn cp-btn-primary"
              disabled={perfil.formState.isSubmitting || !perfil.formState.isDirty}
            >
              {perfil.formState.isSubmitting ? 'Guardando...' : 'Guardar nombre'}
            </button>
          </form>
        </section>

        {/* Contraseña */}
        <section style={seccion} aria-labelledby="titulo-password">
          <h2 id="titulo-password" style={tituloSeccion}>
            Contraseña
          </h2>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, margin: '0 0 20px' }}>
            Para cambiarla, confirma primero la contraseña que usas hoy.
          </p>

          <form onSubmit={clave.handleSubmit(guardarPassword)} noValidate>
            <div className="cp-field">
              <label htmlFor="current-password" className="cp-label">
                Contraseña actual
              </label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                className={`cp-input ${e2.currentPassword ? 'error' : ''}`}
                aria-invalid={e2.currentPassword ? true : undefined}
                aria-describedby={e2.currentPassword ? 'current-password-error' : undefined}
                {...clave.register('currentPassword')}
              />
              {e2.currentPassword && (
                <p id="current-password-error" className="cp-field-error" role="alert">{e2.currentPassword.message}</p>
              )}
            </div>

            <div className="cp-field">
              <label htmlFor="new-password" className="cp-label">
                Contraseña nueva
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                className={`cp-input ${e2.newPassword ? 'error' : ''}`}
                aria-invalid={e2.newPassword ? true : undefined}
                aria-describedby={e2.newPassword ? 'new-password-error' : 'new-password-ayuda'}
                {...clave.register('newPassword')}
              />
              {e2.newPassword ? (
                <p id="new-password-error" className="cp-field-error" role="alert">{e2.newPassword.message}</p>
              ) : (
                <p id="new-password-ayuda" className="cp-field-hint">
                  {AYUDA_PASSWORD}
                </p>
              )}
            </div>

            <div className="cp-field">
              <label htmlFor="confirm-new-password" className="cp-label">
                Repite la contraseña nueva
              </label>
              <input
                id="confirm-new-password"
                type="password"
                autoComplete="new-password"
                className={`cp-input ${e2.confirmPassword ? 'error' : ''}`}
                aria-invalid={e2.confirmPassword ? true : undefined}
                aria-describedby={e2.confirmPassword ? 'confirm-new-password-error' : undefined}
                {...clave.register('confirmPassword')}
              />
              {e2.confirmPassword && (
                <p id="confirm-new-password-error" className="cp-field-error" role="alert">{e2.confirmPassword.message}</p>
              )}
            </div>

            {errorPassword && <ErrorMessage error={errorPassword} />}
            {passwordCambiada && (
              <p className="cp-field-success" role="status">
                Contraseña actualizada. Úsala la próxima vez que ingreses.
              </p>
            )}

            <button
              type="submit"
              className="cp-btn cp-btn-primary"
              style={{ marginTop: 8 }}
              disabled={clave.formState.isSubmitting}
            >
              {clave.formState.isSubmitting ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
