import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['test/unit/**/*.test.{ts,tsx}', 'test/fluent/**/*.test.{ts,tsx}', 'test/regression/**/*.test.{ts,tsx}'],
    // e2e/ es un proyecto aparte (Serenity/JS + Cucumber + Playwright).
    exclude: ['node_modules/**', 'e2e/**'],
    globals: true,
    setupFiles: ['./test/setup.ts'],
  },
})
