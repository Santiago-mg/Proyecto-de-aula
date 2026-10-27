import { ShoppingBag, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Phone, PhoneColor } from '../../types/phone'

function formatCOP(n: number) {
  return '$' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n) + ' COP'
}

interface StickyAddToCartProps {
  phone: Phone
  selectedColor: PhoneColor | null
  qty: number
  onAdd(): void
}

export function StickyAddToCart({ phone, selectedColor, qty, onAdd }: StickyAddToCartProps) {
  const [visible, setVisible] = useState(false)

  // Aparece cuando se hace scroll hacia abajo > 500px
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible || phone.stock === 0) return null

  return (
    <div className={`cp-sticky-cart ${visible ? 'visible' : ''}`}>
      <div className="cp-container cp-sticky-cart-inner">
        <div className="cp-sticky-cart-info">
          {phone.heroImage && (
            <img src={phone.heroImage} alt={phone.name} className="cp-sticky-cart-img" />
          )}
          <div>
            <div className="cp-sticky-cart-name">{phone.name}</div>
            {selectedColor && (
              <div className="cp-sticky-cart-color">
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: selectedColor.hex,
                    marginRight: 5,
                  }}
                />
                {selectedColor.name}
              </div>
            )}
          </div>
        </div>

        <div className="cp-sticky-cart-right">
          <div className="cp-sticky-cart-price">{formatCOP(phone.price * qty)}</div>
          <button
            className="cp-btn cp-btn-primary"
            style={{ animation: 'glowPulse 2s ease-in-out infinite' }}
            onClick={onAdd}
          >
            <ShoppingBag size={15} />
            Agregar al carrito
          </button>
          <div className="cp-sticky-cart-trust">
            <ShieldCheck size={12} style={{ color: '#22ff88' }} />
            <span>Garantía incluida</span>
          </div>
        </div>
      </div>
    </div>
  )
}
