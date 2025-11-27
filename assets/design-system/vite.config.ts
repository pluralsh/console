import { resolve } from 'path'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'styled-components',
        '@emotion/react',
        '@emotion/styled',
        'honorable',
        'honorable-theme-default',
        'react-transition-group',
      ],
      output: {
        manualChunks(id: string) {
          if (id.includes('elkjs')) return 'elkjs'
        },
      },
    },
  },
  plugins: [
    react({
      babel: {
        plugins: ['styled-components'],
        babelrc: false,
        configFile: false,
      },
    }),
    dts({
      insertTypesEntry: true,
      include: ['src'],
      exclude: ['**/*.stories.tsx', '**/*.test.tsx'],
      beforeWriteFile: (filePath, content) => ({
        filePath: filePath.replace(/src/, 'dist'),
        content,
      }),
    }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
      format: 'esm',
    },
  },
})
