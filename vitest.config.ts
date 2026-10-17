import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/e2e/**/*.spec.ts'],
    testTimeout: 60_000,
    hookTimeout: 300_000,
    // Every spec file builds its own Nuxt app; too many at once starve each other past the hook timeout
    maxWorkers: 4
  }
})
