import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { useState } from 'react'
import { loginSchema, type LoginForm } from '../validation/credenciales'
import { consumirAvisoDeSesion } from '../services/api'

export function Login() {
  const { user, login, isLoading } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<Error | null>(null)
  // Aviso que deja el interceptor de la API al cerrar una sesión (cuenta
  // suspendida o sesión vencida). Se lee una sola vez al montar.
  const [aviso] = useState(consumirAvisoDeSesion)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  // Si ya hay sesión, ir al dashboard
  if (user) return <Navigate to="/dashboard" replace />

  async function onSubmit(data: LoginForm) {
    setServerError(null)
    try {
      await login(data.email, data.password)
      navigate('/dashboard')
    } catch (err) {
      setServerError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  return (
    <div className="cp-auth-page">
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
      >
      <div className="cp-auth-card">
        <Link to="/" className="cp-logo" style={{ marginBottom: 32, display: 'block' }}>
          Celular<span>Pro</span>
          <span className="cp-logo-badge">✓</span>
        </Link>

        <h1 className="cp-auth-title">Ingresar</h1>
        <p className="cp-auth-sub">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="cp-link">
            Regístrate gratis
          </Link>
        </p>

        {aviso && (
          <p className="cp-field-error" role="alert" data-testid="aviso-sesion">
            {aviso}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="cp-field">
            <label htmlFor="email" className="cp-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              className={`cp-input ${errors.email ? 'error' : ''}`}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? 'email-error' : undefined}
              placeholder="tu@correo.com"
              {...register('email')}
            />
            {errors.email && (
              <p id="email-error" className="cp-field-error" role="alert">{errors.email.message}</p>
            )}
          </div>

          <div className="cp-field">
            <label htmlFor="password" className="cp-label">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className={`cp-input ${errors.password ? 'error' : ''}`}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? 'password-error' : undefined}
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password && (
              <p id="password-error" className="cp-field-error" role="alert">{errors.password.message}</p>
            )}
          </div>

          {serverError && <ErrorMessage error={serverError} />}

          <button
            type="submit"
            className="cp-btn cp-btn-primary"
            style={{ width: '100%', marginTop: 24 }}
            disabled={isLoading}
          >
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
      </motion.div>
    </div>
  )
}
