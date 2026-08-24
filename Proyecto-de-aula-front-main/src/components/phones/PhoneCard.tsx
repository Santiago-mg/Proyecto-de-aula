import { ShieldCheck, Battery } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PhoneListItem } from '../../types/phone'

const CONDITION_LABEL: Record<string, string> = {
  NEW: 'Nuevo',
  CERTIFIED: 'Certificado',
  USED: 'Usado verificado',
}

function formatCOP(n: number) {
  return (
    '$' +
    new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n) +
    ' COP'
  )
}

interface PhoneCardProps {
  phone: PhoneListItem
}

export function PhoneCard({ phone }: PhoneCardProps) {
  const hasDiscount = phone.compareAt && phone.compareAt > phone.price
  const discountPct = hasDiscount
    ? Math.round((1 - phone.price / phone.compareAt!) * 100)
    : 0

  return (
    <Link to={`/phones/${phone.slug}`} className="cp-phone-card">
      {/* Imagen */}
      <div className="cp-phone-card-img">
        {phone.heroImage ? (
          <img src={phone.heroImage} alt={phone.name} loading="lazy" />
        ) : (
          <div className="cp-phone-card-placeholder">📱</div>
        )}

        {/* Badges */}
        <div className="cp-phone-card-badges">
          {phone.badge && (
            <span className="cp-badge cp-badge-accent">{phone.badge}</span>
          )}
          {phone.verified && (
            <span className="cp-badge cp-badge-verified">
              <ShieldCheck size={10} /> Verificado
            </span>
          )}
          {hasDiscount && (
            <span className="cp-badge cp-badge-discount">-{discountPct}%</span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="cp-phone-card-body">
        <div className="cp-phone-card-condition">
          {CONDITION_LABEL[phone.condition]}
        </div>
        <div className="cp-phone-card-meta">
          <span className="cp-phone-card-brand">{phone.brand}</span>
          <span className="cp-phone-card-category">{phone.category}</span>
        </div>
        <h3 className="cp-phone-card-name">{phone.name}</h3>

        {/* Specs rápidas */}
        <div className="cp-phone-card-specs">
          {phone.storage && <span>{phone.storage}</span>}
          {phone.ram && <span>{phone.ram} RAM</span>}
          {phone.batteryHealth !== null && phone.condition !== 'NEW' && (
            <span>
              <Battery size={11} /> {phone.batteryHealth}%
            </span>
          )}
        </div>

        {/* Precio */}
        <div className="cp-phone-card-pricing">
          <span className="cp-phone-card-price">{formatCOP(phone.price)}</span>
          {hasDiscount && (
            <span className="cp-phone-card-compare">
              {formatCOP(phone.compareAt!)}
            </span>
          )}
        </div>

        {phone.stock === 0 && (
          <div className="cp-phone-card-no-stock">Sin stock</div>
        )}
        {phone.stock > 0 && phone.stock <= 3 && (
          <div className="cp-phone-card-low-stock">
            Últimas {phone.stock} unidades
          </div>
        )}
      </div>
    </Link>
  )
}
