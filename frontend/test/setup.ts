import '@testing-library/jest-dom/vitest'

// jsdom no implementa IntersectionObserver; varios componentes de UI
// (RevealOnScroll, animaciones con framer-motion) lo usan al montar.
// Un stub mínimo evita que esos componentes truenen durante los tests.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  class IntersectionObserverStub {
    readonly root: Element | null = null
    readonly rootMargin: string = ''
    readonly thresholds: ReadonlyArray<number> = []
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  }
  // @ts-expect-error - stub simplificado, suficiente para los tests
  globalThis.IntersectionObserver = IntersectionObserverStub
}
