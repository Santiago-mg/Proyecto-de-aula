import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { useState } from 'react'
import {
  AYUDA_PASSWORD,
  registroSchema,
  type RegistroForm,
} from '../validation/credenciales'


export function Register() {
  const { user, register: registerUser, isLoading } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<Error | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistroForm>({ resolver: zodResolver(registroSchema) })

  if (user) return <Navigate to="/dashboard" replace />

  async function onSubmit(data: RegistroForm) {
    setServerError(null)
    try {
      await registerUser(data.email, data.name, data.password)
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

        <h1 className="cp-auth-title">Crear cuenta</h1>
        <p className="cp-auth-sub">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="cp-link">
            Ingresar
          </Link>
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="cp-field">
            <label htmlFor="name" className="cp-label">
              Nombre completo
            </label>
            <input
              id="name"
              type="text"
              className={`cp-input ${errors.name ? 'error' : ''}`}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? 'name-error' : undefined}
              placeholder="Tu nombre"
              {...register('name')}
            />
            {errors.name && (
              <p id="name-error" className="cp-field-error" role="alert">{errors.name.message}</p>
            )}
          </div>

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
              aria-describedby={errors.password ? 'password-error' : 'password-ayuda'}
              placeholder="Mínimo 8 caracteres"
              {...register('password')}
            />
            {errors.password ? (
              <p id="password-error" className="cp-field-error" role="alert">{errors.password.message}</p>
            ) : (
              <p id="password-ayuda" className="cp-field-hint">
                {AYUDA_PASSWORD}
              </p>
            )}
          </div>

          <div className="cp-field">
            <label htmlFor="confirmPassword" className="cp-label">
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              className={`cp-input ${errors.confirmPassword ? 'error' : ''}`}
              aria-invalid={errors.confirmPassword ? true : undefined}
              aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              placeholder="Repite tu contraseña"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p id="confirmPassword-error" className="cp-field-error" role="alert">{errors.confirmPassword.message}</p>
            )}
          </div>

          {serverError && <ErrorMessage error={serverError} />}

          <button
            type="submit"
            className="cp-btn cp-btn-primary"
            style={{ width: '100%', marginTop: 24 }}
            disabled={isLoading}
          >
            {isLoading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
          </button>
        </form>
      </div>
      </motion.div>
    </div>
  )
}
