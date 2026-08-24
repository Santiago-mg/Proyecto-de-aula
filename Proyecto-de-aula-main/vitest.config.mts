import { defineConfig } from 'vitest/config'
import dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/unit/**/*.test.ts'],
    globals: true,
    env: {
      JWT_SECRET: process.env.JWT_SECRET ?? 'test-secret',
    },
  },
})
