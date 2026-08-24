import { useEffect, useState } from 'react'
import { Loading } from '../../components/ui/Loading'
import { Pagination } from '../../components/ui/Pagination'
import { adminService } from '../../services/admin.service'
import type { Order, OrderStatus } from '../../types/order'

function formatCOP(n: number) {
  return '$' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)
}

const STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']

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

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [updating, setUpdating] = useState<string | null>(null)

  function load(p: number) {
    setLoading(true)
    adminService
      .getAllOrders(p)
      .then((r) => {
        setOrders(r.data)
        setMeta(r.meta)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(page) }, [page])

  async function handleStatus(orderId: string, status: string) {
    setUpdating(orderId)
    try {
      const updated = await adminService.updateOrderStatus(orderId, status)
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="cp-admin-page">
      <div className="cp-admin-page-header">
        <div>
          <div className="cp-admin-page-eyebrow">— Gestión</div>
          <h1 className="cp-admin-page-title">Órdenes</h1>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-soft)' }}>
          {meta.total} órdenes totales
        </div>
      </div>

      {loading ? (
        <Loading text="Cargando órdenes..." />
      ) : (
        <>
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
                  <th>Cambiar estado</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>
                        {order.orderRef}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{order.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{order.email}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{order.city}, {order.dept}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {order.items.map((item) => (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {item.heroImage && (
                              <img
                                src={item.heroImage}
                                alt=""
                                style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4 }}
                              />
                            )}
                            <span style={{ fontSize: 12 }}>{item.name} ×{item.qty}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
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
                      {new Date(order.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td>
                      <select
                        className="cp-select"
                        style={{ fontSize: 11, padding: '6px 10px' }}
                        value={order.status}
                        disabled={updating === order.id}
                        onChange={(e) => handleStatus(order.id, e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={meta.totalPages} onPage={setPage} />
        </>
      )}
    </div>
  )
}
