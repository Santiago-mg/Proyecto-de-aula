import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { ordersService } from '../services/orders.service'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import type { CheckoutFormData } from '../types/order'

const schema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nombre requerido'),
  phone: z.string().min(7, 'Teléfono inválido'),
  address: z.string().min(5, 'Dirección requerida'),
  city: z.string().min(2, 'Ciudad requerida'),
  dept: z.string().min(2, 'Departamento requerido'),
})

function formatCOP(n: number) {
  return (
    '$' +
    new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n) +
    ' COP'
  )
}

export function Checkout() {
  const { cart, clearCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: user?.email ?? '',
      name: user?.name ?? '',
    },
  })

  if (cart.length === 0) return <Navigate to="/catalog" replace />

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const shipping = subtotal > 500000 ? 0 : 20000
  const total = subtotal + shipping

  async function onSubmit(data: CheckoutFormData) {
    setServerError(null)
    setLoading(true)
    try {
      const order = await ordersService.create(data, cart)
      clearCart()
      navigate(`/dashboard?order=${order.orderRef}`)
    } catch (err) {
      setServerError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cp-container cp-checkout-layout" style={{ paddingTop: 48, paddingBottom: 80 }}>
      {/* Formulario */}
      <div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 36,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            marginBottom: 32,
          }}
        >
          Finalizar compra
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <h3 className="cp-checkout-section-title">Datos de entrega</h3>

          <div className="cp-field-row">
            <div className="cp-field">
              <label htmlFor="name" className="cp-label">Nombre completo</label>
              <input
                id="name"
                className={`cp-input ${errors.name ? 'error' : ''}`}
                placeholder="Tu nombre"
                {...register('name')}
              />
              {errors.name && <p className="cp-field-error">{errors.name.message}</p>}
            </div>
            <div className="cp-field">
              <label htmlFor="email" className="cp-label">Email</label>
              <input
                id="email"
                type="email"
                className={`cp-input ${errors.email ? 'error' : ''}`}
                placeholder="tu@correo.com"
                {...register('email')}
              />
              {errors.email && <p className="cp-field-error">{errors.email.message}</p>}
            </div>
          </div>

          <div className="cp-field">
            <label htmlFor="phone" className="cp-label">Teléfono</label>
            <input
              id="phone"
              className={`cp-input ${errors.phone ? 'error' : ''}`}
              placeholder="3001234567"
              {...register('phone')}
            />
            {errors.phone && <p className="cp-field-error">{errors.phone.message}</p>}
          </div>

          <div className="cp-field">
            <label htmlFor="address" className="cp-label">Dirección</label>
            <input
              id="address"
              className={`cp-input ${errors.address ? 'error' : ''}`}
              placeholder="Calle 10 # 43-25, Apto 301"
              {...register('address')}
            />
            {errors.address && <p className="cp-field-error">{errors.address.message}</p>}
          </div>

          <div className="cp-field-row">
            <div className="cp-field">
              <label htmlFor="city" className="cp-label">Ciudad</label>
              <input
                id="city"
                className={`cp-input ${errors.city ? 'error' : ''}`}
                placeholder="Medellín"
                {...register('city')}
              />
              {errors.city && <p className="cp-field-error">{errors.city.message}</p>}
            </div>
            <div className="cp-field">
              <label htmlFor="dept" className="cp-label">Departamento</label>
              <input
                id="dept"
                className={`cp-input ${errors.dept ? 'error' : ''}`}
                placeholder="Antioquia"
                {...register('dept')}
              />
              {errors.dept && <p className="cp-field-error">{errors.dept.message}</p>}
            </div>
          </div>

          {serverError && <ErrorMessage error={serverError} />}

          <button
            type="submit"
            className="cp-btn cp-btn-primary"
            style={{ width: '100%', fontSize: 15, padding: '16px', marginTop: 16 }}
            disabled={loading}
          >
            {loading ? 'Procesando...' : `Confirmar pedido — ${formatCOP(total)}`}
          </button>
        </form>
      </div>

      {/* Resumen */}
      <div>
        <h3 className="cp-checkout-section-title">Resumen</h3>
        <div className="cp-checkout-summary">
          {cart.map((item) => (
            <div key={item.key} className="cp-checkout-item">
              {item.heroImage && (
                <img src={item.heroImage} alt={item.name} className="cp-checkout-item-img" />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)' }}>
                  {item.colorName} · ×{item.qty}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                {formatCOP(item.price * item.qty)}
              </div>
            </div>
          ))}

          <div className="cp-checkout-totals">
            <div className="cp-checkout-row">
              <span>Subtotal</span>
              <span>{formatCOP(subtotal)}</span>
            </div>
            <div className="cp-checkout-row">
              <span>Envío</span>
              <span>{shipping === 0 ? '¡Gratis!' : formatCOP(shipping)}</span>
            </div>
            <div className="cp-checkout-row cp-checkout-total">
              <span>Total</span>
              <span>{formatCOP(total)}</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 16,
              padding: 12,
              background: 'color-mix(in oklab, var(--accent) 10%, transparent)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--ink-soft)',
            }}
          >
            <ShieldCheck size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            Pago seguro · Garantía incluida en cada equipo
          </div>
        </div>
      </div>
    </div>
  )
}
