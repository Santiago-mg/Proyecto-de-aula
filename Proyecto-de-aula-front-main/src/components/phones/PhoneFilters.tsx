import type { PhonesQuery } from '../../types/phone'

interface PhoneFiltersProps {
  query: PhonesQuery
  onChange(q: Partial<PhonesQuery>): void
}

const CONDITIONS = [
  { value: '', label: 'Todos' },
  { value: 'NEW', label: 'Nuevos' },
  { value: 'CERTIFIED', label: 'Certificados' },
  { value: 'USED', label: 'Usados' },
]

const BRANDS = [
  { value: '', label: 'Todas las marcas' },
  { value: 'Apple', label: 'Apple (iPhone)' },
  { value: 'Samsung', label: 'Samsung' },
  { value: 'Xiaomi', label: 'Xiaomi' },
  { value: 'Motorola', label: 'Motorola' },
]

const CATEGORIES = [
  { value: '', label: 'Todas las categorías' },
  { value: 'apple', label: 'iPhone' },
  { value: 'samsung', label: 'Samsung' },
  { value: 'xiaomi', label: 'Xiaomi' },
  { value: 'motorola', label: 'Motorola' },
]

export function PhoneFilters({ query, onChange }: PhoneFiltersProps) {
  return (
    <aside className="cp-filters">
      <div className="cp-filters-title">Filtros</div>

      {/* Búsqueda */}
      <div className="cp-filter-group">
        <label className="cp-filter-label">Buscar</label>
        <input
          className="cp-input"
          type="text"
          placeholder="iPhone 15, Samsung S24..."
          value={query.search ?? ''}
          onChange={(e) => onChange({ search: e.target.value || undefined, page: 1 })}
        />
      </div>

      {/* Condición */}
      <div className="cp-filter-group">
        <label className="cp-filter-label">Condición</label>
        <div className="cp-filter-pills">
          {CONDITIONS.map((c) => (
            <button
              key={c.value}
              className={`cp-pill ${(query.condition ?? '') === c.value ? 'active' : ''}`}
              onClick={() =>
                onChange({
                  condition: (c.value || undefined) as PhonesQuery['condition'],
                  page: 1,
                })
              }
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Categoría */}
      <div className="cp-filter-group">
        <label className="cp-filter-label">Categoría</label>
        <select
          className="cp-select"
          value={query.category ?? ''}
          onChange={(e) =>
            onChange({ category: e.target.value || undefined, page: 1 })
          }
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Marca */}
      <div className="cp-filter-group">
        <label className="cp-filter-label">Marca</label>
        <select
          className="cp-select"
          value={query.brand ?? ''}
          onChange={(e) =>
            onChange({ brand: e.target.value || undefined, page: 1 })
          }
        >
          {BRANDS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      {/* Solo verificados */}
      <div className="cp-filter-group">
        <label className="cp-filter-checkbox">
          <input
            type="checkbox"
            checked={query.verified === true}
            onChange={(e) =>
              onChange({ verified: e.target.checked || undefined, page: 1 })
            }
          />
          Solo verificados ✓
        </label>
      </div>

      {/* Precio */}
      <div className="cp-filter-group">
        <label className="cp-filter-label">Precio máximo (COP)</label>
        <input
          className="cp-input"
          type="number"
          placeholder="Ej: 3000000"
          value={query.maxPrice ?? ''}
          onChange={(e) =>
            onChange({
              maxPrice: e.target.value ? Number(e.target.value) : undefined,
              page: 1,
            })
          }
        />
      </div>

      {/* Limpiar */}
      <button
        className="cp-btn cp-btn-ghost"
        style={{ width: '100%', marginTop: 8 }}
        onClick={() =>
          onChange({
            search: undefined,
            condition: undefined,
            category: undefined,
            brand: undefined,
            verified: undefined,
            minPrice: undefined,
            maxPrice: undefined,
            page: 1,
          })
        }
      >
        Limpiar filtros
      </button>
    </aside>
  )
}
