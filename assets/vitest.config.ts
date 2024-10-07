import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vitest.dev/config/
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['setupTests.ts'],
    root: 'src',
    coverage: {
      provider: 'istanbul',
      reportsDirectory: '../coverage',
    },
    deps: {
      inline: [
        '@pluralsh/design-system',
        'pluralsh-absinthe-socket-apollo-link',
      ],
    },
  },
  cacheDir: '../node_modules/',
  esbuild: { jsx: 'automatic' },
  plugins: [tsconfigPaths()],
  resolve: {
    mainFields: ['module'],
  },
})
