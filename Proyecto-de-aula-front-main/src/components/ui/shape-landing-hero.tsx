// HeroGeometric — floating ellipse shapes overlay
// Adaptado para Vite + React + TypeScript estricto (sin Tailwind, sin any, sin console.log)
import { motion, type Variants } from 'framer-motion'
import { Circle } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

// Bezier tuple tipado como tupla fija para satisfacer framer-motion Easing
const EASE_CUBIC: [number, number, number, number] = [0.25, 0.4, 0.25, 1]
const EASE_SHAPE: [number, number, number, number] = [0.23, 0.86, 0.39, 0.96]

// ─── ElegantShape ─────────────────────────────────────────────────────────────

interface ElegantShapeProps {
  delay?: number
  width?: number
  height?: number
  rotate?: number
  /** Color RGBA de la elipse, p.ej. "rgba(99,102,241,0.15)" */
  color?: string
  style?: CSSProperties
}

function ElegantShape({
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  color = 'rgba(99,102,241,0.15)',
  style,
}: ElegantShapeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -150, rotate: rotate - 15 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{
        duration: 2.4,
        delay,
        ease: EASE_SHAPE,
        opacity: { duration: 1.2 },
      }}
      style={{ position: 'absolute', ...style }}
    >
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width, height, position: 'relative' }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '9999px',
            background: `linear-gradient(to right, ${color}, transparent)`,
            backdropFilter: 'blur(2px)',
            border: '2px solid rgba(255,255,255,0.15)',
            boxShadow: '0 8px 32px 0 rgba(255,255,255,0.1)',
          }}
        />
      </motion.div>
    </motion.div>
  )
}

// ─── HeroGeometric ────────────────────────────────────────────────────────────

export interface HeroGeometricProps {
  badge?: string
  title1?: string
  title2?: string
  description?: string
  /** Si se pasan children, se renderizan en lugar del contenido por defecto */
  children?: ReactNode
}

/**
 * Sección hero con elipses flotantes animadas.
 * No tiene fondo propio — funciona sobre ShaderBackground.
 */
export function HeroGeometric({
  badge = 'CelularPro',
  title1 = 'Compra un celular',
  title2 = 'en el que confiar.',
  description,
  children,
}: HeroGeometricProps) {
  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.5 + i * 0.2,
        ease: EASE_CUBIC,
      },
    }),
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Gradiente sutil de profundidad */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 60% 80% at 30% 50%, rgba(99,102,241,0.06) 0%, transparent 70%),' +
            'radial-gradient(ellipse 60% 80% at 70% 50%, rgba(244,63,94,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Elipses flotantes */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
      >
        <ElegantShape delay={0.3} width={600} height={140} rotate={12}
          color="rgba(99,102,241,0.18)" style={{ left: '-5%', top: '18%' }} />
        <ElegantShape delay={0.5} width={500} height={120} rotate={-15}
          color="rgba(244,63,94,0.15)"  style={{ right: '-2%', bottom: '18%' }} />
        <ElegantShape delay={0.4} width={300} height={80}  rotate={-8}
          color="rgba(139,92,246,0.15)" style={{ left: '8%',  bottom: '12%' }} />
        <ElegantShape delay={0.6} width={200} height={60}  rotate={20}
          color="rgba(245,158,11,0.15)" style={{ right: '18%', top: '12%' }} />
        <ElegantShape delay={0.7} width={150} height={40}  rotate={-25}
          color="rgba(6,182,212,0.18)"  style={{ left: '22%', top: '6%' }} />
      </div>

      {/* Contenido */}
      {children ? (
        <div style={{ position: 'relative', zIndex: 10, width: '100%' }}>
          {children}
        </div>
      ) : (
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            maxWidth: 768,
            margin: '0 auto',
            padding: '0 24px',
            textAlign: 'center',
          }}
        >
          {/* Badge */}
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 14px',
              borderRadius: 9999,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              marginBottom: 40,
            }}
          >
            <Circle
              size={8}
              style={{ fill: 'rgba(244,63,94,0.8)', color: 'rgba(244,63,94,0.8)' }}
            />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em' }}>
              {badge}
            </span>
          </motion.div>

          {/* Título */}
          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            style={{
              fontSize: 'clamp(40px, 8vw, 88px)',
              fontWeight: 700,
              lineHeight: 1.05,
              marginBottom: 24,
              letterSpacing: '-0.02em',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.92)' }}>{title1}</span>
            <br />
            <span
              style={{
                background: 'linear-gradient(to right, #a5b4fc, rgba(255,255,255,0.9), #fda4af)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {title2}
            </span>
          </motion.h1>

          {/* Descripción */}
          {description && (
            <motion.p
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              style={{
                fontSize: 'clamp(15px, 2vw, 19px)',
                color: 'rgba(255,255,255,0.4)',
                lineHeight: 1.7,
                fontWeight: 300,
                letterSpacing: '0.02em',
                maxWidth: 540,
                margin: '0 auto',
              }}
            >
              {description}
            </motion.p>
          )}
        </div>
      )}
    </div>
  )
}
