/// <reference types="vitest" />

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import tsconfigPaths from 'vite-tsconfig-paths'
import pluginRewriteAll from 'vite-plugin-rewrite-all'

const API_URL = process.env.BASE_URL ? `https://${process.env.BASE_URL}` : 'https://console.plural.sh'
const WS_URL = process.env.BASE_URL ? `wss://${process.env.BASE_URL}` : 'wss://console.plural.sh'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    basicSsl(),
    react(),
    tsconfigPaths(),
    pluginRewriteAll(), // Fix 404 error for urls with dots in their path
  ],
  server: {
    port: 3000,
    https: true,
    proxy: {
      '/v1': API_URL,
      '/gql': API_URL,
      '/socket': WS_URL,
    },
  },
  define: {
    'process.env': {}, // Needed otherwise production build will fail with Uncaught ReferenceError: process is not defined. See https://github.com/vitejs/vite/issues/1973
  },
  build: {
    outDir: 'build',
    sourcemap: process.env.NODE_ENV !== 'production', // Seems to cause JavaScript heap out of memory errors on build
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/setupTests.ts'],
  },
})
