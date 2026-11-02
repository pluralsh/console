import { resolve } from 'path'

import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      // Regexes so subpath imports (react/jsx-runtime, react/compiler-runtime,
      // react-dom/client) stay external too; bundling their CJS builds leaves
      // require('react') calls in the ESM output, which browsers can't run.
      external: [
        /^react(\/.*)?$/,
        /^react-dom(\/.*)?$/,
        /^styled-components(\/.*)?$/,
        /^@emotion\/react(\/.*)?$/,
        /^@emotion\/styled(\/.*)?$/,
        /^react-transition-group(\/.*)?$/,
      ],
      output: {
        manualChunks(id: string) {
          if (id.includes('elkjs')) return 'elkjs'
        },
      },
    },
  },
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset({ panicThreshold: 'all_errors' })],
      plugins: ['styled-components'],
      exclude: [/[/\\]node_modules[/\\]/],
    }),
  ],
})
