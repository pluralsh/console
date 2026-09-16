import { defineConfig } from 'vitest/config'

// https://vitest.dev/config/
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    globalSetup: 'utils/test-globals.ts',
    root: 'src',
  },
  cacheDir: '../node_modules/',
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    tsconfigPaths: true,
    mainFields: ['module'],
  },
})
