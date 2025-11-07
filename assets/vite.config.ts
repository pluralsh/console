import { sentryVitePlugin } from '@sentry/vite-plugin'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import pluginRewriteAll from 'vite-plugin-rewrite-all'
import tsconfigPaths from 'vite-tsconfig-paths'

const API_URL = process.env.BASE_URL
  ? `https://${process.env.BASE_URL}`
  : 'https://console.plural.sh'
const WS_URL = process.env.BASE_URL
  ? `wss://${process.env.BASE_URL}`
  : 'wss://console.plural.sh'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    basicSsl(),
    react({
      babel: {
        plugins: ['styled-components'],
        babelrc: false,
        configFile: false,
      },
    }),
    tsconfigPaths({ loose: true }),
    pluginRewriteAll(), // Fix 404 error for urls with dots in their path
    sentryVitePlugin({
      org: 'plural-labs',
      project: 'console-frontend',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/v1': API_URL,
      '/gql': API_URL,
      '/api/v1': API_URL,
      '/socket': WS_URL,
    },
  },
  preview: {
    port: 3000,
    proxy: {
      '/v1': API_URL,
      '/gql': API_URL,
      '/api/v1': API_URL,
      '/socket': WS_URL,
    },
  },
  build: {
    outDir: 'build',
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('/src/generated')) return 'generated'
          if (id.includes('mermaid')) return 'mermaid'
          if (id.includes('elkjs')) return 'elk'
          if (id.includes('@pluralsh/design-system')) return 'design-system'
          if (id.includes('lodash')) return 'lodash'
          if (id.includes('apollo')) return 'apollo'
        },
      },
    },
  },
  resolve: {
    preserveSymlinks: true,
    dedupe: [
      'styled-components',
      'react',
      'react-dom',
      'react-transition-group',
    ],
  },
})
