import {
  Package,
  ShieldOff,
  ShoppingCart,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading } from '../../components/ui/Loading'
import { adminService } from '../../services/admin.service'
import type { AdminStats } from '../../types/admin'

function formatCOP(n: number) {
  if (n >= 1_000_000)
    return '$' + (n / 1_000_000).toFixed(1).replace('.0', '') + 'M COP'
  if (n >= 1_000)
    return '$' + (n / 1_000).toFixed(0) + 'K COP'
  return '$' + n + ' COP'
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#ffaa00',
  CONFIRMED: '#00e5ff',
  SHIPPED: '#a855f7',
  DELIVERED: '#22ff88',
  CANCELLED: '#ff3860',
}
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  SHIPPED: 'En camino',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    adminService
      .getStats()
      .then(setStats)
      .catch((err) => {
        const status = err?.response?.status
        const detail = err?.response?.data?.detail
        const serverError = err?.response?.data?.error
        if (status === 401 || status === 403) {
          setError('Sin permisos. Verifica que estés logueado como admin.')
        } else if (!navigator.onLine || err?.code === 'ERR_NETWORK') {
          setError('No se puede conectar al backend. ¿Está corriendo en localhost:3001?')
        } else {
          setError(detail ?? serverError ?? err?.message ?? 'Error desconocido')
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return <Loading text="Cargando estadísticas..." />

  if (error || !stats) return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '50vh', gap: 16, textAlign: 'center',
    }}>
      <div style={{ fontSize: 48 }}>⚠️</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '0.04em' }}>
        No se pudieron cargar las estadísticas
      </h2>
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-soft)',
        maxWidth: 420, lineHeight: 1.6,
        background: 'var(--surface-2)', border: '1px solid var(--glass-border)',
        padding: '12px 20px', borderRadius: 'var(--radius)',
      }}>
        {error ?? 'Respuesta vacía del servidor'}
      </p>
      <button className="cp-btn cp-btn-secondary" onClick={load}>
        Reintentar
      </button>
    </div>
  )

  const maxRevenue = Math.max(...stats.revenueByDay.map((d) => d.amount), 1)

  return (
    <div className="cp-admin-page">
      {/* Header */}
      <div className="cp-admin-page-header">
        <div>
          <div className="cp-admin-page-eyebrow">— Panel principal</div>
          <h1 className="cp-admin-page-title">Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/admin/phones/new" className="cp-btn cp-btn-primary">
            <Zap size={14} /> Nuevo celular
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="cp-admin-kpi-grid">
        <div className="cp-kpi-card cp-kpi-cyan">
          <div className="cp-kpi-icon"><TrendingUp size={22} /></div>
          <div className="cp-kpi-value">{formatCOP(stats.orders.revenue)}</div>
          <div className="cp-kpi-label">Revenue total</div>
          <div className="cp-kpi-sub">
            {formatCOP(stats.orders.revenueThisMonth)} este mes
          </div>
        </div>
        <div className="cp-kpi-card cp-kpi-violet">
          <div className="cp-kpi-icon"><ShoppingCart size={22} /></div>
          <div className="cp-kpi-value">{stats.orders.total}</div>
          <div className="cp-kpi-label">Órdenes totales</div>
          <div className="cp-kpi-sub">
            {stats.orders.delivered} entregadas · {stats.orders.shipped} en camino
          </div>
        </div>
        <div className="cp-kpi-card cp-kpi-green">
          <div className="cp-kpi-icon"><Users size={22} /></div>
          <div className="cp-kpi-value">{stats.users.total}</div>
          <div className="cp-kpi-label">Usuarios</div>
          <div className="cp-kpi-sub">
            +{stats.users.newThisWeek} esta semana · {stats.users.banned} baneados
          </div>
        </div>
        <div className="cp-kpi-card cp-kpi-orange">
          <div className="cp-kpi-icon"><Package size={22} /></div>
          <div className="cp-kpi-value">{stats.phones.total}</div>
          <div className="cp-kpi-label">Celulares en catálogo</div>
          <div className="cp-kpi-sub">
            {stats.phones.inStock} en stock · {stats.phones.verified} verificados
          </div>
        </div>
      </div>

      <div className="cp-admin-grid-2">
        {/* Revenue chart */}
        <div className="cp-admin-card">
          <div className="cp-admin-card-header">
            <div className="cp-admin-card-title">Revenue — últimos 7 días</div>
          </div>
          <div className="cp-revenue-chart">
            {stats.revenueByDay.map((day) => (
              <div key={day.date} className="cp-revenue-bar-wrap">
                <div className="cp-revenue-bar-track">
                  <div
                    className="cp-revenue-bar-fill"
                    style={{ height: `${(day.amount / maxRevenue) * 100}%` }}
                  />
                </div>
                <div className="cp-revenue-bar-label">{day.date}</div>
                {day.amount > 0 && (
                  <div className="cp-revenue-bar-value">
                    {formatCOP(day.amount)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Order status donut visual */}
        <div className="cp-admin-card">
          <div className="cp-admin-card-header">
            <div className="cp-admin-card-title">Estado de órdenes</div>
          </div>
          <div className="cp-order-status-list">
            {(
              [
                ['CONFIRMED', stats.orders.confirmed],
                ['SHIPPED', stats.orders.shipped],
                ['DELIVERED', stats.orders.delivered],
                ['PENDING', stats.orders.pending],
                ['CANCELLED', stats.orders.cancelled],
              ] as [string, number][]
            ).map(([status, count]) => {
              const pct =
                stats.orders.total > 0
                  ? Math.round((count / stats.orders.total) * 100)
                  : 0
              return (
                <div key={status} className="cp-order-status-row">
                  <div className="cp-order-status-info">
                    <span
                      className="cp-order-status-dot"
                      style={{ background: STATUS_COLOR[status] }}
                    />
                    <span>{STATUS_LABEL[status]}</span>
                  </div>
                  <div className="cp-order-status-bar-wrap">
                    <div className="cp-order-status-bar">
                      <div
                        className="cp-order-status-bar-fill"
                        style={{
                          width: `${pct}%`,
                          background: STATUS_COLOR[status],
                        }}
                      />
                    </div>
                    <span className="cp-order-status-count">{count}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Órdenes recientes */}
      <div className="cp-admin-card" style={{ marginTop: 24 }}>
        <div className="cp-admin-card-header">
          <div className="cp-admin-card-title">Órdenes recientes</div>
          <Link to="/admin/orders" className="cp-btn cp-btn-ghost" style={{ fontSize: 11 }}>
            Ver todas →
          </Link>
        </div>
        <div className="cp-admin-table-wrap">
          <table className="cp-admin-table">
            <thead>
              <tr>
                <th>Referencia</th>
                <th>Cliente</th>
                <th>Productos</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>
                      {order.orderRef}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{order.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{order.email}</div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {order.itemCount} ítem{order.itemCount !== 1 ? 's' : ''}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
                    {formatCOP(order.total)}
                  </td>
                  <td>
                    <span
                      className="cp-badge"
                      style={{
                        background: STATUS_COLOR[order.status] + '20',
                        color: STATUS_COLOR[order.status],
                        border: `1px solid ${STATUS_COLOR[order.status]}40`,
                      }}
                    >
                      {STATUS_LABEL[order.status]}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)' }}>
                    {new Date(order.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick stats phones */}
      <div className="cp-admin-grid-3" style={{ marginTop: 24 }}>
        <div className="cp-admin-mini-stat">
          <div className="cp-admin-mini-stat-num" style={{ color: 'var(--accent)' }}>
            {stats.phones.verified}
          </div>
          <div className="cp-admin-mini-stat-label">Celulares verificados ✓</div>
        </div>
        <div className="cp-admin-mini-stat">
          <div className="cp-admin-mini-stat-num" style={{ color: '#ff3860' }}>
            {stats.phones.outOfStock}
          </div>
          <div className="cp-admin-mini-stat-label">Sin stock</div>
        </div>
        <div className="cp-admin-mini-stat">
          <div className="cp-admin-mini-stat-num" style={{ color: '#a855f7' }}>
            {stats.users.banned > 0 ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldOff size={20} /> {stats.users.banned}
              </span>
            ) : (
              '0'
            )}
          </div>
          <div className="cp-admin-mini-stat-label">Usuarios baneados</div>
        </div>
      </div>
    </div>
  )
}
