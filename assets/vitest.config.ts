import { defineConfig } from 'vitest/config'

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
  optimizeDeps: {
    include: ['pluralsh-absinthe-socket-apollo-link'],
  },
  resolve: {
    mainFields: ['module'],
    alias: {
      components: 'components',
      utils: 'utils',
      generated: 'generated',
      helpers: 'helpers',
      routes: 'routes',
      markdoc: 'markdoc',
      theme: 'theme.ts',
    },
  },
})
