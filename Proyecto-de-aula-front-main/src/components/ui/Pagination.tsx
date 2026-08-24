interface PaginationProps {
  page: number
  totalPages: number
  onPage(page: number): void
}

export function Pagination({ page, totalPages, onPage }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 48,
      }}
    >
      <button
        className="cp-btn cp-btn-secondary"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        ← Anterior
      </button>

      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--ink-soft)',
          padding: '0 16px',
          letterSpacing: '0.1em',
        }}
      >
        {page} / {totalPages}
      </span>

      <button
        className="cp-btn cp-btn-secondary"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Siguiente →
      </button>
    </div>
  )
}
