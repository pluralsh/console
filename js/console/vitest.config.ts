import babel from '@rolldown/plugin-babel'
import { reactCompilerPreset } from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

// https://vitest.dev/config/
export default defineConfig({
  // run tests against compiled components, same as the production build
  plugins: [
    babel({
      presets: [reactCompilerPreset({ panicThreshold: 'all_errors' })],
      exclude: [/[/\\]node_modules[/\\]/, /[/\\]src[/\\]generated[/\\]/],
    }),
  ],
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
    // Same as vite.config.ts: resolve the design system from src so unit
    // tests don't need `yarn workspace @pluralsh/design-system build`.
    alias: {
      '@pluralsh/design-system': resolve(
        import.meta.dirname,
        '../design-system/src'
      ),
    },
  },
})
