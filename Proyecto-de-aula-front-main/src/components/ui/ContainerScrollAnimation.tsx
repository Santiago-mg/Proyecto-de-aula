// Adaptado para Vite + React (sin "use client" ni next/image)
import React, { useRef } from 'react'
import {
  useScroll,
  useTransform,
  motion,
  type MotionValue,
} from 'framer-motion'

interface ContainerScrollProps {
  titleComponent: string | React.ReactNode
  children: React.ReactNode
}

export function ContainerScroll({ titleComponent, children }: ContainerScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: containerRef })
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const rotate = useTransform(scrollYProgress, [0, 1], [18, 0])
  const scale  = useTransform(scrollYProgress, [0, 1], isMobile ? [0.7, 0.95] : [1.05, 1])
  const translate = useTransform(scrollYProgress, [0, 1], [0, -80])

  return (
    <div
      ref={containerRef}
      style={{
        height: isMobile ? '56rem' : '80rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: isMobile ? '8px' : '40px 80px',
      }}
    >
      <div
        style={{
          paddingTop: isMobile ? '40px' : '120px',
          paddingBottom: isMobile ? '40px' : '120px',
          width: '100%',
          position: 'relative',
          perspective: '1200px',
        }}
      >
        <ScrollTitle translate={translate} titleComponent={titleComponent} />
        <ScrollCard rotate={rotate} translate={translate} scale={scale}>
          {children}
        </ScrollCard>
      </div>
    </div>
  )
}

// ─── Título que flota al hacer scroll ────────────────────────
function ScrollTitle({
  translate,
  titleComponent,
}: {
  translate: MotionValue<number>
  titleComponent: React.ReactNode
}) {
  return (
    <motion.div
      style={{ translateY: translate }}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true }}
      className="cp-scroll-title"
    >
      {titleComponent}
    </motion.div>
  )
}

// ─── Tarjeta 3D que rota con el scroll ────────────────────────
function ScrollCard({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>
  scale: MotionValue<number>
  translate: MotionValue<number>
  children: React.ReactNode
}) {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          '0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a',
      }}
      className="cp-scroll-card"
    >
      <div className="cp-scroll-card-inner">{children}</div>
    </motion.div>
  )
}
