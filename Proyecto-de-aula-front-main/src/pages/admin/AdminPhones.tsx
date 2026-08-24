import { Pencil, Trash2, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading } from '../../components/ui/Loading'
import { phonesService } from '../../services/phones.service'
import type { PhoneListItem } from '../../types/phone'

function formatCOP(n: number) {
  return '$' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)
}

const CONDITION_LABEL: Record<string, string> = {
  NEW: 'Nuevo',
  CERTIFIED: 'Certificado',
  USED: 'Usado',
}

export function AdminPhones() {
  const [phones, setPhones] = useState<PhoneListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    phonesService
      .getAll({ limit: 50 })
      .then((r) => setPhones(r.data))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}"?`)) return
    setDeletingId(id)
    try {
      await phonesService.remove(id)
      setPhones((prev) => prev.filter((p) => p.id !== id))
    } catch {
      alert('Error al eliminar el celular')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="cp-container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: 8,
            }}
          >
            — Administrador
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 36,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Gestión de celulares
          </h1>
        </div>
        <Link to="/admin/phones/new" className="cp-btn cp-btn-primary">
          <Plus size={16} /> Nuevo celular
        </Link>
      </div>

      {loading && <Loading />}

      {!loading && (
        <div className="cp-admin-table-wrap">
          <table className="cp-admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Marca</th>
                <th>Condición</th>
                <th>Stock</th>
                <th>Precio</th>
                <th>Verificado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {phones.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {p.heroImage && (
                        <img
                          src={p.heroImage}
                          alt=""
                          style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }}
                        />
                      )}
                      <span style={{ fontWeight: 500 }}>{p.name}</span>
                    </div>
                  </td>
                  <td>{p.brand}</td>
                  <td>
                    <span className="cp-badge cp-badge-accent">
                      {CONDITION_LABEL[p.condition]}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: p.stock === 0 ? '#e05252' : p.stock <= 3 ? '#e09052' : 'inherit' }}>
                      {p.stock}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                    {formatCOP(p.price)}
                  </td>
                  <td>
                    {p.verified ? (
                      <span style={{ color: 'var(--accent)' }}>✓</span>
                    ) : (
                      <span style={{ color: 'var(--ink-faint)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link
                        to={`/admin/phones/${p.id}/edit`}
                        className="cp-icon-btn"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </Link>
                      <button
                        className="cp-icon-btn"
                        title="Eliminar"
                        disabled={deletingId === p.id}
                        onClick={() => handleDelete(p.id, p.name)}
                        style={{ color: '#e05252' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {phones.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-soft)' }}>
              No hay celulares. Crea el primero.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
