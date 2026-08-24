import {
  ShieldCheck,
  Battery,
  Cpu,
  Camera,
  Monitor,
  HardDrive,
  MemoryStick,
  ChevronLeft,
  Eye,
  Truck,
  RefreshCw,
  Lock,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loading } from '../components/ui/Loading'
import { StickyAddToCart } from '../components/ui/StickyAddToCart'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { phonesService } from '../services/phones.service'
import type { Phone, PhoneColor } from '../types/phone'

const CONDITION_LABEL: Record<string, string> = {
  NEW: 'Nuevo',
  CERTIFIED: 'Reacondicionado certificado',
  USED: 'Usado verificado',
}

function formatCOP(n: number) {
  return (
    '$' +
    new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n) +
    ' COP'
  )
}

export function PhoneDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [phone, setPhone] = useState<Phone | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [selectedColor, setSelectedColor] = useState<PhoneColor | null>(null)
  const [selectedImg, setSelectedImg] = useState(0)
  const [qty, setQty] = useState(1)
  const { addToCart } = useCart()
  const { showToast } = useToast()

  // Simula "personas viendo ahora" — número fijo por slug para que sea consistente
  const viewersNow = useMemo(() => {
    const seed = (slug ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    return 3 + (seed % 14)
  }, [slug])

  useEffect(() => {
    if (!slug) return
    phonesService
      .getBySlug(slug)
      .then((p) => {
        setPhone(p)
        if (p.colors.length > 0) setSelectedColor(p.colors[0])
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  function handleAddToCart() {
    if (!phone || !selectedColor) return
    addToCart(phone, selectedColor, qty)
    showToast(`✓ ${phone.name} añadido al carrito`)
  }

  if (loading) return <Loading />
  if (notFound || !phone)
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>📵</div>
        <h2>Celular no encontrado</h2>
        <Link to="/catalog" className="cp-btn cp-btn-primary" style={{ marginTop: 24, display: 'inline-block' }}>
          Volver al catálogo
        </Link>
      </div>
    )

  const images = phone.images.length > 0
    ? phone.images.map((i) => i.url)
    : phone.heroImage
    ? [phone.heroImage]
    : []

  const specs = [
    phone.chip && { icon: <Cpu size={14} />, label: 'Procesador', value: phone.chip },
    phone.ram && { icon: <MemoryStick size={14} />, label: 'RAM', value: phone.ram },
    phone.storage && { icon: <HardDrive size={14} />, label: 'Almacenamiento', value: phone.storage },
    phone.camera && { icon: <Camera size={14} />, label: 'Cámara', value: phone.camera },
    phone.screen && { icon: <Monitor size={14} />, label: 'Pantalla', value: phone.screen },
    phone.battery && { icon: <Battery size={14} />, label: 'Batería', value: phone.battery },
    phone.batteryHealth !== null && phone.condition !== 'NEW' && {
      icon: <Battery size={14} />,
      label: 'Salud de batería',
      value: `${phone.batteryHealth}%`,
    },
  ].filter(Boolean) as { icon: JSX.Element; label: string; value: string }[]

  return (
    <>
    <StickyAddToCart
      phone={phone}
      selectedColor={selectedColor}
      qty={qty}
      onAdd={handleAddToCart}
    />
    <div className="cp-container cp-reveal" style={{ paddingTop: 40, paddingBottom: 80 }}>
      <Link
        to="/catalog"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--ink-soft)',
          textDecoration: 'none',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          letterSpacing: '0.1em',
          marginBottom: 32,
        }}
      >
        <ChevronLeft size={14} /> Catálogo
      </Link>

      {/* Social proof strip */}
      <div className="cp-detail-social-proof">
        <span className="cp-social-proof-viewers">
          <Eye size={13} />
          <span className="cp-dot-live" />
          <strong>{viewersNow}</strong> personas viendo ahora
        </span>
        {phone.stock > 0 && phone.stock <= 5 && (
          <span className="cp-social-proof-urgency">
            ⚡ Solo <strong>{phone.stock}</strong> en stock
          </span>
        )}
      </div>

      <div className="cp-detail-grid">
        {/* Galería */}
        <div className="cp-detail-gallery">
          <div className="cp-detail-main-img">
            {images[selectedImg] ? (
              <img src={images[selectedImg]} alt={phone.name} />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  fontSize: 80,
                }}
              >
                📱
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="cp-detail-thumbnails">
              {images.map((url, i) => (
                <button
                  key={i}
                  className={`cp-detail-thumb ${selectedImg === i ? 'active' : ''}`}
                  onClick={() => setSelectedImg(i)}
                >
                  <img src={url} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="cp-detail-info">
          {/* Badges */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <span className="cp-badge cp-badge-accent">
              {CONDITION_LABEL[phone.condition]}
            </span>
            {phone.verified && (
              <span className="cp-badge cp-badge-verified">
                <ShieldCheck size={11} /> Verificado
              </span>
            )}
            {phone.badge && (
              <span className="cp-badge cp-badge-accent">{phone.badge}</span>
            )}
          </div>

          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--ink-soft)',
              letterSpacing: '0.1em',
              marginBottom: 6,
            }}
          >
            {phone.brand}
          </div>

          <h1 className="cp-detail-name">{phone.name}</h1>

          <p style={{ color: 'var(--ink-soft)', marginBottom: 24, lineHeight: 1.6 }}>
            {phone.shortDesc}
          </p>

          {/* Precio */}
          <div style={{ marginBottom: 24 }}>
            <div className="cp-detail-price">{formatCOP(phone.price)}</div>
            {phone.compareAt && phone.compareAt > phone.price && (
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: 'var(--ink-faint)',
                  textDecoration: 'line-through',
                  marginTop: 4,
                }}
              >
                {formatCOP(phone.compareAt)}
              </div>
            )}
          </div>

          {/* Batería */}
          {phone.batteryHealth !== null && phone.condition !== 'NEW' && (
            <div className="cp-battery-bar-wrap">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-soft)',
                  }}
                >
                  Salud de batería
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: 'var(--accent)',
                    fontWeight: 500,
                  }}
                >
                  {phone.batteryHealth}%
                </span>
              </div>
              <div className="cp-battery-bar">
                <div
                  className="cp-battery-fill"
                  style={{ width: `${phone.batteryHealth}%` }}
                />
              </div>
            </div>
          )}

          {/* Colores */}
          {phone.colors.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-soft)',
                  marginBottom: 10,
                }}
              >
                Color — {selectedColor?.name}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {phone.colors.map((c) => (
                  <button
                    key={c.colorId}
                    className={`cp-color-btn ${selectedColor?.colorId === c.colorId ? 'active' : ''}`}
                    style={{ background: c.hex }}
                    onClick={() => setSelectedColor(c)}
                    title={c.name}
                    aria-label={c.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Cantidad */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--ink-soft)',
              }}
            >
              Cantidad
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                className="cp-qty-btn"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
              >
                −
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', minWidth: 24, textAlign: 'center' }}>
                {qty}
              </span>
              <button
                className="cp-qty-btn"
                onClick={() => setQty((q) => Math.min(phone.stock, q + 1))}
                disabled={qty >= phone.stock}
              >
                +
              </button>
            </div>
            {phone.stock <= 3 && phone.stock > 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#e09052' }}>
                Solo {phone.stock} disponibles
              </span>
            )}
          </div>

          {/* CTA */}
          {phone.stock > 0 ? (
            <button
              className="cp-btn cp-btn-primary cp-btn-buy"
              onClick={handleAddToCart}
              disabled={phone.colors.length > 0 && !selectedColor}
            >
              Agregar al carrito
            </button>
          ) : (
            <button className="cp-btn" disabled style={{ width: '100%', opacity: 0.5 }}>
              Sin stock
            </button>
          )}

          {/* Trust badges */}
          <div className="cp-detail-trust-badges">
            {[
              { icon: <ShieldCheck size={14} />, label: 'IMEI limpio verificado' },
              { icon: <Truck size={14} />, label: 'Envío en 24–48 h' },
              { icon: <RefreshCw size={14} />, label: 'Garantía incluida' },
              { icon: <Lock size={14} />, label: 'Pago 100% seguro' },
            ].map((b) => (
              <div key={b.label} className="cp-detail-trust-badge">
                <span style={{ color: 'var(--accent)' }}>{b.icon}</span>
                <span>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Specs */}
      {specs.length > 0 && (
        <div style={{ marginTop: 64 }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              marginBottom: 32,
            }}
          >
            Especificaciones
          </h2>
          <div className="cp-specs-grid">
            {specs.map((s) => (
              <div key={s.label} className="cp-spec-item">
                <div className="cp-spec-icon">{s.icon}</div>
                <div>
                  <div className="cp-spec-label">{s.label}</div>
                  <div className="cp-spec-value">{s.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      {phone.features.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              marginBottom: 24,
            }}
          >
            Características
          </h2>
          <ul className="cp-features-list">
            {phone.features.map((f) => (
              <li key={f} className="cp-feature-item">
                <span style={{ color: 'var(--accent)' }}>✓</span> {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {phone.longDesc && (
        <div style={{ marginTop: 48, maxWidth: 720 }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              marginBottom: 16,
            }}
          >
            Descripción
          </h2>
          <p style={{ color: 'var(--ink-soft)', lineHeight: 1.7 }}>{phone.longDesc}</p>
        </div>
      )}
    </div>
    </>
  )
}
