// Wrapper reutilizable que revela cualquier elemento al entrar en viewport
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface RevealOnScrollProps {
  children: ReactNode
  delay?: number
  direction?: 'up' | 'left' | 'right' | 'none'
  className?: string
}

const VARIANTS = {
  hidden: {
    up:    { opacity: 0, y: 40 },
    left:  { opacity: 0, x: -32 },
    right: { opacity: 0, x: 32 },
    none:  { opacity: 0 },
  },
  visible: {
    up:    { opacity: 1, y: 0 },
    left:  { opacity: 1, x: 0 },
    right: { opacity: 1, x: 0 },
    none:  { opacity: 1 },
  },
}

export function RevealOnScroll({
  children,
  delay = 0,
  direction = 'up',
  className,
}: RevealOnScrollProps) {
  return (
    <motion.div
      className={className}
      initial={VARIANTS.hidden[direction]}
      whileInView={VARIANTS.visible[direction]}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        duration: 0.65,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
