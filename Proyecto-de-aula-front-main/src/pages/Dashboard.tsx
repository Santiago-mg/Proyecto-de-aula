import { Package, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading } from '../components/ui/Loading'
import { RevealOnScroll } from '../components/ui/RevealOnScroll'
import { useAuth } from '../context/AuthContext'
import { ordersService } from '../services/orders.service'
import type { Order } from '../types/order'

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  SHIPPED: 'En camino',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#e09052',
  CONFIRMED: 'var(--accent)',
  SHIPPED: '#52a8e0',
  DELIVERED: '#52c96e',
  CANCELLED: '#e05252',
}

function formatCOP(n: number) {
  return (
    '$' +
    new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n) +
    ' COP'
  )
}

export function Dashboard() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ordersService
      .getMyOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="cp-container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      {/* Cabecera */}
      <div style={{ marginBottom: 48 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: 12,
          }}
        >
          — Mi cuenta
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 40,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          Hola, {user?.name.split(' ')[0]}
        </h1>
        <p style={{ color: 'var(--ink-soft)', marginTop: 8 }}>{user?.email}</p>
      </div>

      {/* Mis pedidos */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 26,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          Mis pedidos
        </h2>
        <Link to="/catalog" className="cp-btn cp-btn-secondary">
          Seguir comprando
        </Link>
      </div>

      {loading && <Loading text="Cargando pedidos..." />}

      {!loading && orders.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            border: '1px solid var(--line)',
            borderRadius: 16,
          }}
        >
          <Package size={48} style={{ color: 'var(--ink-faint)', marginBottom: 16 }} />
          <p style={{ color: 'var(--ink-soft)', marginBottom: 24 }}>
            Todavía no tienes pedidos
          </p>
          <Link to="/catalog" className="cp-btn cp-btn-primary">
            Ver catálogo →
          </Link>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {orders.map((order, i) => (
            <RevealOnScroll key={order.id} delay={i * 0.06}>
            <div className="cp-order-card">
              <div className="cp-order-card-header">
                <div>
                  <div className="cp-order-ref">{order.orderRef}</div>
                  <div className="cp-order-date">
                    {new Date(order.createdAt).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
                <span
                  className="cp-badge"
                  style={{
                    background: STATUS_COLOR[order.status] + '22',
                    color: STATUS_COLOR[order.status],
                    border: `1px solid ${STATUS_COLOR[order.status]}44`,
                  }}
                >
                  {STATUS_LABEL[order.status]}
                </span>
              </div>

              <div className="cp-order-items">
                {order.items.map((item) => (
                  <div key={item.id} className="cp-order-item">
                    {item.heroImage && (
                      <img
                        src={item.heroImage}
                        alt={item.name}
                        className="cp-order-item-img"
                      />
                    )}
                    <div>
                      <div className="cp-order-item-name">{item.name}</div>
                      {item.colorName && (
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            color: 'var(--ink-soft)',
                          }}
                        >
                          {item.colorName}
                        </div>
                      )}
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 12,
                          color: 'var(--ink-soft)',
                        }}
                      >
                        ×{item.qty}
                      </div>
                    </div>
                    <div
                      style={{
                        marginLeft: 'auto',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                      }}
                    >
                      {formatCOP(item.price * item.qty)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="cp-order-total">
                <ShieldCheck size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ color: 'var(--ink-soft)', fontSize: 13 }}>
                  Total:
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                  {formatCOP(order.total)}
                </span>
              </div>
            </div>
            </RevealOnScroll>
          ))}
        </div>
      )}
    </div>
  )
}
