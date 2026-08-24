import { X, Zap } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

const MESSAGES = [
  '⚡ ENVÍO GRATIS en compras superiores a $500.000 COP',
  '🛡️ IMEI verificado y limpio en todos nuestros equipos',
  '🔋 Batería certificada — publicamos el % real antes de comprar',
  '✅ Garantía real: 6 meses en certificados, 30 días en usados',
  '📦 Despacho en 24–48 h a toda Colombia',
]

export function PromoBar() {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <div className="cp-promo-bar">
      <div className="cp-promo-bar-track">
        {/* scrolling marquee */}
        <div className="cp-promo-marquee">
          {[...MESSAGES, ...MESSAGES].map((msg, i) => (
            <span key={i} className="cp-promo-marquee-item">
              <Zap size={11} />
              {msg}
            </span>
          ))}
        </div>
      </div>

      <div className="cp-promo-bar-cta">
        <Link to="/catalog?condition=CERTIFIED" className="cp-promo-bar-link">
          Ver certificados →
        </Link>
        <button
          className="cp-promo-bar-close"
          onClick={() => setVisible(false)}
          aria-label="Cerrar"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
