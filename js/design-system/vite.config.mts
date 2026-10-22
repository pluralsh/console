import { resolve } from 'path'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(import.meta.dirname, 'src/index.ts'),
        'product-shots': resolve(
          import.meta.dirname,
          'src/components/product-shots/index.ts'
        ),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format}.js`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'styled-components',
        '@emotion/react',
        '@emotion/styled',
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
    react(),
    babel({
      plugins: ['styled-components'],
      exclude: [/[/\\]node_modules[/\\]/],
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
})
