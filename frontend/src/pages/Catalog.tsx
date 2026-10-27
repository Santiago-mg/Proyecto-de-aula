import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PhoneCard } from '../components/phones/PhoneCard'
import { PhoneFilters } from '../components/phones/PhoneFilters'
import { Loading } from '../components/ui/Loading'
import { Pagination } from '../components/ui/Pagination'
import { RevealOnScroll } from '../components/ui/RevealOnScroll'
import { phonesService } from '../services/phones.service'
import type { PhoneListItem, PhonesQuery } from '../types/phone'

export function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [phones, setPhones] = useState<PhoneListItem[]>([])
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const query: PhonesQuery = {
    page: Number(searchParams.get('page')) || 1,
    category: searchParams.get('category') ?? undefined,
    brand: searchParams.get('brand') ?? undefined,
    condition: (searchParams.get('condition') as PhonesQuery['condition']) ?? undefined,
    verified: searchParams.get('verified') === 'true' ? true : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    search: searchParams.get('search') ?? undefined,
  }

  useEffect(() => {
    setLoading(true)
    setError(false)
    phonesService
      .getAll(query)
      .then((r) => {
        setPhones(r.data)
        setMeta(r.meta)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()])

  function updateQuery(changes: Partial<PhonesQuery>) {
    const next = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(changes)) {
      if (v === undefined || v === '') {
        next.delete(k)
      } else {
        next.set(k, String(v))
      }
    }
    setSearchParams(next)
  }

  return (
    <div className="cp-catalog-layout cp-container">
      <PhoneFilters query={query} onChange={updateQuery} />

      <div className="cp-catalog-main">
        <div className="cp-catalog-header">
          <h1 className="cp-catalog-title">Catálogo</h1>
          {!loading && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--ink-soft)',
              }}
            >
              {meta.total} equipo{meta.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading && <Loading />}

        {error && (
          <p style={{ color: 'var(--ink-soft)', textAlign: 'center', padding: '40px 0' }}>
            No se pudo cargar el catálogo. Verifica la conexión.
          </p>
        )}

        {!loading && !error && phones.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-soft)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <p>Sin resultados para estos filtros.</p>
          </div>
        )}

        {!loading && !error && phones.length > 0 && (
          <>
            <div className="cp-phones-grid">
              {phones.map((p, i) => (
                <RevealOnScroll key={p.id} delay={(i % 3) * 0.07}>
                  <PhoneCard phone={p} />
                </RevealOnScroll>
              ))}
            </div>
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              onPage={(p) => updateQuery({ page: p })}
            />
          </>
        )}
      </div>
    </div>
  )
}
