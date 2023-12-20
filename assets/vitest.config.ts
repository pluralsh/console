import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vitest.dev/config/
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['setupTests.ts'],
    root: 'src',
    cache: {
      dir: '../node_modules',
    },
  },
  plugins: [tsconfigPaths() as any],
  optimizeDeps: {
    include: ['pluralsh-absinthe-socket-apollo-link'],
  },
  resolve: {
    mainFields: ['module'],
  },
})
