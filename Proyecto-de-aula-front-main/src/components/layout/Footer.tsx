import { Link } from 'react-router-dom'
import { ShieldCheck, Truck, RefreshCw, Headphones } from 'lucide-react'

export function Footer() {
  return (
    <footer className="cp-footer">
      <div className="cp-container">
        {/* Trust badges */}
        <div className="cp-trust-grid">
          {[
            {
              icon: <ShieldCheck size={24} />,
              title: 'Inspección técnica',
              desc: 'Cada celular pasa por 32 puntos de revisión antes de publicarse.',
            },
            {
              icon: <Truck size={24} />,
              title: 'Envío gratis',
              desc: 'En compras mayores a $500.000 COP. Entrega en 24–48 h.',
            },
            {
              icon: <RefreshCw size={24} />,
              title: 'Garantía real',
              desc: '6 meses en certificados, 30 días en usados. Sin letra pequeña.',
            },
            {
              icon: <Headphones size={24} />,
              title: 'Soporte humano',
              desc: 'Un experto responde tu mensaje en menos de 2 horas.',
            },
          ].map((b) => (
            <div key={b.title} className="cp-trust-item">
              <div className="cp-trust-icon">{b.icon}</div>
              <div>
                <div className="cp-trust-title">{b.title}</div>
                <div className="cp-trust-desc">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="cp-footer-grid">
          <div>
            <div className="cp-logo" style={{ marginBottom: 12 }}>
              Celular<span>Pro</span>
              <span className="cp-logo-badge">✓</span>
            </div>
            <p className="cp-footer-tagline">
              El marketplace donde la confianza está certificada.
            </p>
          </div>

          <div>
            <div className="cp-footer-col-title">Tienda</div>
            <ul className="cp-footer-links">
              <li><Link to="/catalog">Todos los celulares</Link></li>
              <li><Link to="/catalog?condition=NEW">Nuevos</Link></li>
              <li><Link to="/catalog?condition=CERTIFIED">Certificados</Link></li>
              <li><Link to="/catalog?condition=USED">Usados verificados</Link></li>
            </ul>
          </div>

          <div>
            <div className="cp-footer-col-title">Marcas</div>
            <ul className="cp-footer-links">
              <li><Link to="/catalog?category=apple">iPhone</Link></li>
              <li><Link to="/catalog?category=samsung">Samsung</Link></li>
              <li><Link to="/catalog?category=xiaomi">Xiaomi</Link></li>
              <li><Link to="/catalog?category=motorola">Motorola</Link></li>
            </ul>
          </div>

          <div>
            <div className="cp-footer-col-title">Ayuda</div>
            <ul className="cp-footer-links">
              <li><Link to="/dashboard">Mis pedidos</Link></li>
              <li><a href="mailto:soporte@celularpro.co">Contacto</a></li>
              <li><Link to="/catalog">Garantías</Link></li>
            </ul>
          </div>
        </div>

        <div className="cp-footer-bottom">
          <span>© {new Date().getFullYear()} CelularPro · Medellín, Colombia</span>
          <span>Precios en pesos colombianos (COP) · IVA incluido</span>
        </div>
      </div>
    </footer>
  )
}
