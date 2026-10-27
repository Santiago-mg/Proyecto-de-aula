import { ShieldCheck, Zap, RefreshCw, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PhoneCard } from '../components/phones/PhoneCard'
import { Loading } from '../components/ui/Loading'
import { ContainerScroll } from '../components/ui/ContainerScrollAnimation'
import { RevealOnScroll } from '../components/ui/RevealOnScroll'
import { ShaderBackground } from '../components/ui/ShaderBackground'
import { HeroGeometric } from '../components/ui/shape-landing-hero'
import { phonesService } from '../services/phones.service'
import type { PhoneListItem } from '../types/phone'

export function Home() {
  const [featured, setFeatured] = useState<PhoneListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    phonesService
      .getAll({ limit: 6 })
      .then((r) => setFeatured(r.data))
      .catch(() => setFeatured([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {/*
       * ── FONDO SPLIT ──────────────────────────────────────────────────────
       * Primera mitad (hero): ShaderBackground WebGL + elipses HeroGeometric
       * Segunda mitad (catálogo en adelante): ShaderBackground plasma visible
       */}
      <ShaderBackground />

      {/* ─── HERO — Primera mitad: elipses flotantes + texto ──── */}
      <section className="cp-hero" style={{ background: 'transparent', padding: 0 }}>
        <HeroGeometric>
          {/* Contenido propio de CelularPro dentro del wrapper de formas */}
          <div className="cp-container cp-hero-content">
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                marginBottom: 28,
              }}
            >
              — Celulares certificados · Medellín, Colombia
            </div>
            <h1 className="cp-hero-title">
              Compra un celular
              <br />
              en el que puedes{' '}
              <em style={{ color: 'var(--accent)', fontWeight: 300 }}>
                confiar.
              </em>
            </h1>
            <p className="cp-hero-subtitle">
              Cada equipo pasa por 32 puntos de inspección técnica. Recibes el
              reporte completo antes de decidir. Sin sorpresas.
            </p>
            <div className="cp-hero-actions">
              <Link to="/catalog" className="cp-btn cp-btn-primary cp-btn-lg">
                Ver catálogo →
              </Link>
              <Link
                to="/catalog?condition=CERTIFIED"
                className="cp-btn cp-btn-secondary cp-btn-lg"
              >
                Certificados
              </Link>
            </div>
          </div>
        </HeroGeometric>
      </section>

      {/* ─── TRUST STRIP ──────────────────────────────────────── */}
      <section className="cp-trust-strip">
        <div className="cp-container cp-trust-strip-grid">
          {[
            { icon: <ShieldCheck size={20} />, label: '32 puntos de inspección' },
            { icon: <Zap size={20} />, label: 'Batería verificada' },
            { icon: <RefreshCw size={20} />, label: 'Garantía incluida' },
            { icon: <Star size={20} />, label: '4.9 ★ de satisfacción' },
          ].map((t) => (
            <div key={t.label} className="cp-trust-strip-item">
              <span className="cp-trust-strip-icon">{t.icon}</span>
              <span>{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CATÁLOGO CON SCROLL ANIMATION — Segunda mitad: plasma shader ── */}
      {/* background: transparent → el ShaderBackground se ve directamente */}
      <section className="cp-section" style={{ background: 'transparent', overflow: 'hidden' }}>
        <ContainerScroll
          titleComponent={
            <div style={{ paddingBottom: 8 }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--accent)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  marginBottom: 20,
                }}
              >
                — Catálogo destacado
              </div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(32px, 5vw, 72px)',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  marginBottom: 16,
                }}
              >
                Celulares listos{' '}
                <span style={{ color: 'var(--accent)', textShadow: '0 0 20px rgba(0,229,255,0.4)' }}>
                  para hoy.
                </span>
              </h2>
              <p
                style={{
                  color: 'var(--ink-soft)',
                  fontSize: 16,
                  maxWidth: 520,
                  margin: '0 auto',
                  lineHeight: 1.6,
                }}
              >
                Nuevos, certificados y usados verificados. Todos con IMEI
                limpio y garantía real.
              </p>
            </div>
          }
        >
          {/* Contenido dentro de la tarjeta 3D */}
          {loading ? (
            <Loading />
          ) : featured.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--ink-soft)',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 40 }}>📱</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                Pronto habrá equipos disponibles.
              </span>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 14,
                height: '100%',
                overflow: 'hidden',
              }}
            >
              {featured.slice(0, 6).map((p) => (
                <PhoneCard key={p.id} phone={p} />
              ))}
            </div>
          )}
        </ContainerScroll>

        {/* CTA debajo de la tarjeta */}
        <RevealOnScroll>
          <div style={{ textAlign: 'center', paddingBottom: 48 }}>
            <Link to="/catalog" className="cp-btn cp-btn-primary cp-btn-lg">
              Ver catálogo completo →
            </Link>
          </div>
        </RevealOnScroll>
      </section>

      {/* ─── MANIFIESTO ───────────────────────────────────────── */}
      <section className="cp-section cp-manifesto">
        <div className="cp-container">
          <RevealOnScroll>
            <div className="cp-manifesto-header">
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--accent)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                — Por qué existimos
              </span>
              <h2 className="cp-manifesto-title">
                El mercado de celulares usados
                <br />
                tiene un problema de{' '}
                <em style={{ color: 'var(--accent)', fontWeight: 300 }}>
                  confianza.
                </em>
              </h2>
            </div>
          </RevealOnScroll>

          {[
            {
              n: '01',
              title: 'Inspección real',
              desc: 'Revisamos pantalla, batería, cámara, altavoces, conectores, IMEI y 26 puntos más. El reporte es tuyo antes de comprar.',
            },
            {
              n: '02',
              title: 'Batería certificada',
              desc: 'Publicamos el porcentaje exacto de salud de batería. Si dice 91%, es 91%. Equipos bajo 80% no entran a nuestro catálogo.',
            },
            {
              n: '03',
              title: 'Garantía sin letra pequeña',
              desc: '6 meses en certificados, 30 días en usados. Si falla algo cubierto, lo reparamos o devolvemos tu dinero. Sin preguntas.',
            },
            {
              n: '04',
              title: 'IMEI limpio garantizado',
              desc: 'Verificamos que cada equipo esté libre de reportes, bloqueos de operador y deudas. Recibes el certificado con tu compra.',
            },
          ].map((b, i) => (
            <RevealOnScroll key={b.n} delay={i * 0.08}>
              <div className="cp-manifesto-row">
                <span className="cp-manifesto-num">{b.n}</span>
                <h3 className="cp-manifesto-item-title">{b.title}</h3>
                <p className="cp-manifesto-item-desc">{b.desc}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* ─── CATEGORÍAS ───────────────────────────────────────── */}
      <section className="cp-section cp-categories-section">
        <div className="cp-container">
          <RevealOnScroll>
            <div className="cp-section-header">
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--accent)',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    marginBottom: 16,
                  }}
                >
                  — Categorías más buscadas
                </div>
                <h2 className="cp-section-title">
                  Encuentra tu próximo teléfono por categoría
                </h2>
              </div>
              <Link to="/catalog" className="cp-btn cp-btn-secondary">
                Ver catálogo completo →
              </Link>
            </div>
          </RevealOnScroll>

          <div className="cp-category-grid">
            {[
              {
                id: 'apple',
                title: 'iPhone',
                subtitle: 'Equipos premium certificados',
                image: 'https://1000logos.net/wp-content/uploads/2016/10/Apple-Logo.png',
              },
              {
                id: 'samsung',
                title: 'Samsung',
                subtitle: 'Android potente y actualizado',
                image: 'https://images.samsung.com/is/image/samsung/assets/global/about-us/brand/logo/720_600_1.png?$720_N_PNG$',
              },
              {
                id: 'xiaomi',
                title: 'Xiaomi',
                subtitle: 'Calidad y precio competitivo',
                image: 'https://1000logos.net/wp-content/uploads/2021/08/Xiaomi-logo-500x281.png',
              },
              {
                id: 'motorola',
                title: 'Motorola',
                subtitle: 'Resistencia y duración comprobada',
                image: 'https://cdn.freebiesupply.com/logos/large/2x/motorola-2-logo-png-transparent.png',
              },
            ].map((category, i) => (
              <RevealOnScroll key={category.id} delay={i * 0.08}>
                <Link
                  to={`/catalog?category=${category.id}`}
                  className="cp-category-card"
                >
                  <div className="cp-category-card-img">
                    <img
                      src={category.image}
                      alt={category.title}
                      loading="lazy"
                    />
                  </div>
                  <div className="cp-category-card-body">
                    <span className="cp-category-card-label">{category.title}</span>
                    <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>
                      {category.subtitle}
                    </p>
                  </div>
                </Link>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIOS ──────────────────────────────────────── */}
      <section className="cp-section">
        <div className="cp-container">
          <RevealOnScroll>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--accent)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                marginBottom: 40,
              }}
            >
              — Voces reales
            </div>
          </RevealOnScroll>
          <div className="cp-testimonials-grid">
            {[
              {
                q: 'Compré un iPhone 14 certificado. El reporte de batería fue exacto y llegó en perfectas condiciones.',
                a: 'Valentina Torres',
                r: 'Estudiante · Bogotá',
              },
              {
                q: 'La transparencia es lo que me convenció. Saber el estado real del equipo antes de pagar no tiene precio.',
                a: 'Andrés Mejía',
                r: 'Diseñador · Medellín',
              },
              {
                q: 'Encontré el Samsung S23 que buscaba a un precio justo. Todo como lo prometieron, IMEI limpio.',
                a: 'Carolina Ríos',
                r: 'Contadora · Cali',
              },
            ].map((t, i) => (
              <RevealOnScroll key={t.a} delay={i * 0.12}>
                <figure className="cp-testimonial">
                  <blockquote className="cp-testimonial-quote">
                    "{t.q}"
                  </blockquote>
                  <figcaption className="cp-testimonial-author">
                    <div>{t.a}</div>
                    <div style={{ color: 'var(--ink-soft)', fontSize: 12 }}>
                      {t.r}
                    </div>
                  </figcaption>
                </figure>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ────────────────────────────────────────── */}
      <section className="cp-section">
        <div className="cp-container">
          <RevealOnScroll>
            <div className="cp-cta-banner">
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--accent)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  marginBottom: 16,
                }}
              >
                — Empieza hoy
              </div>
              <h2 className="cp-cta-title">
                Tu próximo celular,{' '}
                <em style={{ fontWeight: 300 }}>sin riesgos.</em>
              </h2>
              <p className="cp-cta-desc">
                Regístrate gratis. Compra con garantía real. Si no queda
                satisfecho, te devolvemos el dinero.
              </p>
              <div className="cp-hero-actions">
                <Link
                  to="/register"
                  className="cp-btn cp-btn-primary cp-btn-lg"
                >
                  Crear cuenta gratis →
                </Link>
                <Link
                  to="/catalog"
                  className="cp-btn cp-btn-secondary cp-btn-lg"
                >
                  Ver catálogo
                </Link>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>
    </div>
  )
}
