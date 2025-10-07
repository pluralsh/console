import { defineConfig, Plugin } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vitest.dev/config/
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    globalSetup: 'utils/test-globals.ts',
    root: 'src',
  },
  cacheDir: '../node_modules/',
  esbuild: { jsx: 'automatic' },
  plugins: [tsconfigPaths() as Plugin],
  resolve: {
    mainFields: ['module'],
  },
})
