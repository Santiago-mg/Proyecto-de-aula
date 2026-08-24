import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { useState } from 'react'
const DOMINIOS_PERMITIDOS = [
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
  'icloud.com',
]
const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'El nombre debe tener al menos 2 caracteres'),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'El correo es obligatorio')
      .email('Correo electrónico inválido')
      .refine(
        (email) => {
          const dominio = email.split('@')[1]

          return DOMINIOS_PERMITIDOS.includes(dominio)
        },
        {
          message:
            'Correo inválido. Usa Gmail, Outlook, Hotmail, Yahoo o iCloud.',
        },
      ),

    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres'),

    confirmPassword: z
      .string()
      .min(1, 'Debes confirmar la contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

export function Register() {
  const {
    user,
    register: registerUser,
    isLoading,
  } = useAuth()

  const navigate = useNavigate()

  const [serverError, setServerError] =
    useState<Error | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  })
  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  async function onSubmit(data: FormData) {
    setServerError(null)

    try {
      const email = data.email
        .trim()
        .toLowerCase()

      await registerUser(
        email,
        data.name.trim(),
        data.password,
      )

      navigate('/dashboard')
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err
          : new Error(
              'No se pudo crear la cuenta',
            ),
      )
    }
  }

  return (
    <div className="cp-auth-page">
      <motion.div
        initial={{
          opacity: 0,
          y: 32,
          scale: 0.97,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          duration: 0.55,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div className="cp-auth-card">
          <Link
            to="/"
            className="cp-logo"
            style={{
              marginBottom: 32,
              display: 'block',
            }}
          >
            Celular<span>Pro</span>
            <span className="cp-logo-badge">
              ✓
            </span>
          </Link>

          <h1 className="cp-auth-title">
            Crear cuenta
          </h1>

          <p className="cp-auth-sub">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="cp-link"
            >
              Ingresar
            </Link>
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            {/* NOMBRE */}
            <div className="cp-field">
              <label
                htmlFor="name"
                className="cp-label"
              >
                Nombre completo
              </label>

              <input
                id="name"
                type="text"
                className={`cp-input ${
                  errors.name ? 'error' : ''
                }`}
                placeholder="Tu nombre"
                autoComplete="name"
                {...register('name')}
              />

              {errors.name && (
                <p
                  className="cp-field-error"
                  role="alert"
                >
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* EMAIL */}
            <div className="cp-field">
              <label
                htmlFor="email"
                className="cp-label"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                className={`cp-input ${
                  errors.email ? 'error' : ''
                }`}
                placeholder="tu@correo.com"
                autoComplete="email"
                {...register('email')}
              />

              {errors.email && (
                <p
                  className="cp-field-error"
                  role="alert"
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* CONTRASEÑA */}
            <div className="cp-field">
              <label
                htmlFor="password"
                className="cp-label"
              >
                Contraseña
              </label>

              <input
                id="password"
                type="password"
                className={`cp-input ${
                  errors.password
                    ? 'error'
                    : ''
                }`}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                {...register('password')}
              />

              {errors.password && (
                <p
                  className="cp-field-error"
                  role="alert"
                >
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* CONFIRMAR CONTRASEÑA */}
            <div className="cp-field">
              <label
                htmlFor="confirmPassword"
                className="cp-label"
              >
                Confirmar contraseña
              </label>

              <input
                id="confirmPassword"
                type="password"
                className={`cp-input ${
                  errors.confirmPassword
                    ? 'error'
                    : ''
                }`}
                placeholder="Repite tu contraseña"
                autoComplete="new-password"
                {...register(
                  'confirmPassword',
                )}
              />

              {errors.confirmPassword && (
                <p
                  className="cp-field-error"
                  role="alert"
                >
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* ERROR DEL SERVIDOR */}
            {serverError && (
              <ErrorMessage
                error={serverError}
              />
            )}

            {/* BOTÓN */}
            <button
              type="submit"
              className="cp-btn cp-btn-primary"
              style={{
                width: '100%',
                marginTop: 24,
              }}
              disabled={isLoading}
            >
              {isLoading
                ? 'Creando cuenta...'
                : 'Crear cuenta gratis'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}