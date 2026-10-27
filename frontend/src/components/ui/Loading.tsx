export function Loading({ text = 'Cargando...' }: { text?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: '80px 0',
        color: 'var(--ink-soft)',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
      }}
    >
      <div className="cp-spinner" />
      {text}
    </div>
  )
}
