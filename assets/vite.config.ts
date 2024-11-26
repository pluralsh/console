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
    // TODO(floreks): Enable once fixed
    // VitePWA({
    //   injectRegister: null,
    //   filename: 'service-worker.ts',
    //   srcDir: 'src',
    //   strategies: 'injectManifest',
    // }),
    tsconfigPaths({ loose: true }),
    pluginRewriteAll(), // Fix 404 error for urls with dots in their path
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
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('moment')) {
            return 'moment'
          }

          if (id.includes('lodash')) {
            return 'lodash'
          }
        },
      },
    },
  },
  resolve: {
    preserveSymlinks: true,
    dedupe: [
      'styled-components',
      'honorable',
      'honorable-theme-default',
      'react',
      'react-dom',
      '@emotion/react',
      '@emotion/styled',
      'react-transition-group',
    ],
  },
})
