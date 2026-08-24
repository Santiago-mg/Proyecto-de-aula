import { useEffect, useState } from 'react'
import { Loading } from '../../components/ui/Loading'
import { adminService } from '../../services/admin.service'
import type { AdminStats as StatsType } from '../../types/admin'

function formatCOP(n: number) {
  return '$' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n) + ' COP'
}

export function AdminStats() {
  const [stats, setStats] = useState<StatsType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminService.getStats().then(setStats).finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading text="Calculando estadísticas..." />
  if (!stats) return <p>Error</p>

  const maxRevenue = Math.max(...stats.revenueByDay.map((d) => d.amount), 1)

  return (
    <div className="cp-admin-page">
      <div className="cp-admin-page-header">
        <div>
          <div className="cp-admin-page-eyebrow">— Análisis</div>
          <h1 className="cp-admin-page-title">Estadísticas</h1>
        </div>
      </div>

      {/* Revenue 7 días - gráfico grande */}
      <div className="cp-admin-card" style={{ marginBottom: 24 }}>
        <div className="cp-admin-card-header">
          <div className="cp-admin-card-title">Revenue últimos 7 días</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>
            {formatCOP(stats.revenueByDay.reduce((a, d) => a + d.amount, 0))}
          </div>
        </div>
        <div className="cp-revenue-chart cp-revenue-chart-lg">
          {stats.revenueByDay.map((day) => (
            <div key={day.date} className="cp-revenue-bar-wrap">
              <div className="cp-revenue-bar-track">
                <div
                  className="cp-revenue-bar-fill"
                  style={{ height: `${(day.amount / maxRevenue) * 100}%` }}
                />
              </div>
              <div className="cp-revenue-bar-label">{day.date}</div>
              <div className="cp-revenue-bar-value">
                {day.count > 0 ? `${day.count} venta${day.count > 1 ? 's' : ''}` : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="cp-admin-grid-2">
        {/* Usuarios */}
        <div className="cp-admin-card">
          <div className="cp-admin-card-header">
            <div className="cp-admin-card-title">Usuarios</div>
          </div>
          <div className="cp-stats-detail-list">
            {[
              { label: 'Total registrados', value: stats.users.total, color: 'var(--accent)' },
              { label: 'Nuevos esta semana', value: stats.users.newThisWeek, color: '#22ff88' },
              { label: 'Administradores', value: stats.users.admins, color: '#a855f7' },
              { label: 'Baneados', value: stats.users.banned, color: '#ff3860' },
            ].map((item) => (
              <div key={item.label} className="cp-stats-detail-row">
                <span className="cp-stats-detail-label">{item.label}</span>
                <span className="cp-stats-detail-value" style={{ color: item.color }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Celulares */}
        <div className="cp-admin-card">
          <div className="cp-admin-card-header">
            <div className="cp-admin-card-title">Inventario</div>
          </div>
          <div className="cp-stats-detail-list">
            {[
              { label: 'Total en catálogo', value: stats.phones.total, color: 'var(--accent)' },
              { label: 'Con stock disponible', value: stats.phones.inStock, color: '#22ff88' },
              { label: 'Verificados ✓', value: stats.phones.verified, color: '#00e5ff' },
              { label: 'Sin stock', value: stats.phones.outOfStock, color: '#ff3860' },
            ].map((item) => (
              <div key={item.label} className="cp-stats-detail-row">
                <span className="cp-stats-detail-label">{item.label}</span>
                <span className="cp-stats-detail-value" style={{ color: item.color }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Órdenes */}
        <div className="cp-admin-card">
          <div className="cp-admin-card-header">
            <div className="cp-admin-card-title">Órdenes</div>
          </div>
          <div className="cp-stats-detail-list">
            {[
              { label: 'Total órdenes', value: stats.orders.total, color: 'var(--ink)' },
              { label: 'Pendientes', value: stats.orders.pending, color: '#ffaa00' },
              { label: 'Confirmadas', value: stats.orders.confirmed, color: '#00e5ff' },
              { label: 'En camino', value: stats.orders.shipped, color: '#a855f7' },
              { label: 'Entregadas', value: stats.orders.delivered, color: '#22ff88' },
              { label: 'Canceladas', value: stats.orders.cancelled, color: '#ff3860' },
            ].map((item) => (
              <div key={item.label} className="cp-stats-detail-row">
                <span className="cp-stats-detail-label">{item.label}</span>
                <span className="cp-stats-detail-value" style={{ color: item.color }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue */}
        <div className="cp-admin-card">
          <div className="cp-admin-card-header">
            <div className="cp-admin-card-title">Revenue</div>
          </div>
          <div className="cp-stats-detail-list">
            {[
              { label: 'Revenue total histórico', value: formatCOP(stats.orders.revenue), color: 'var(--accent)' },
              { label: 'Revenue este mes', value: formatCOP(stats.orders.revenueThisMonth), color: '#22ff88' },
            ].map((item) => (
              <div key={item.label} className="cp-stats-detail-row">
                <span className="cp-stats-detail-label">{item.label}</span>
                <span className="cp-stats-detail-value" style={{ color: item.color, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
