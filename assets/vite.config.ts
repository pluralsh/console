import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { Readable } from 'node:stream'
import { resolve } from 'path'
import { defineConfig, type Plugin } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const API_URL = process.env.BASE_URL
  ? `https://${process.env.BASE_URL}`
  : 'https://console.plural.sh'
const WS_URL = process.env.BASE_URL
  ? `wss://${process.env.BASE_URL}`
  : 'wss://console.plural.sh'

// Dev-only: signed object-store URLs (S3, Azure, localstack) are cross-origin from
// localhost, so direct fetch() fails on CORS. A shim rewrites those requests to
// /__object_store/... and this middleware proxies them server-side. Only
// content-type is forwarded — Vite's HTTP/2 dev server rejects hop-by-hop headers
// like transfer-encoding from upstream.
const objectStoreDevProxy = {
  name: 'object-store-dev-proxy',
  apply: 'serve' as const,
  configureServer({ middlewares }) {
    middlewares.use(async (req, res, next) => {
      if (req.url === '/__object_store/fetch-shim.js') {
        res.setHeader('Content-Type', 'application/javascript')
        return res.end(
          'const f=fetch.bind(window);window.fetch=(i,n)=>{try{const r=new URL(typeof i=="string"?i:i.url);if(r.origin!==location.origin&&/localhost|127\\.0\\.0\\.1|localstack|amazonaws|blob\\.core\\.windows\\.net|X-Amz-|sig=/i.test(r.hostname+r.search))return f("/__object_store/"+r.host+r.pathname+r.search,n)}catch{}return f(i,n)}'
        )
      }
      if (!req.url?.startsWith('/__object_store/')) return next()
      const [host, ...path] = req.url.slice('/__object_store/'.length).split('/')
      if (!host || !path.length) return res.writeHead(400).end()
      const h = host.replace(/^localstack/i, 'localhost')
      try {
        const r = await fetch(
          `${/localhost|127\.0\.0\.1|localstack/i.test(h) ? `http://${h}` : `https://${host}`}/${path.join('/')}`,
          { headers: { host } }
        )
        res.writeHead(r.status, {
          'content-type': r.headers.get('content-type') ?? 'text/plain',
        })
        r.body
          ? Readable.fromWeb(
              r.body as import('stream/web').ReadableStream
            ).pipe(res)
          : res.end()
      } catch {
        res.writeHead(502).end()
      }
    })
  },
  transformIndexHtml: (html: string) =>
    html.replace(
      '<head>',
      '<head><script src="/__object_store/fetch-shim.js"></script>'
    ),
} satisfies Plugin

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
    objectStoreDevProxy,
    // this was very memory intensive (from source maps) and ultimately not that useful
    // could consider reenabling in the future if we rework DS bundling/publishing
    // sentryVitePlugin({
    //   org: 'plural-labs',
    //   project: 'console-frontend',
    //   authToken: process.env.SENTRY_AUTH_TOKEN,
    // }),
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
          if (id.includes('/src/generated')) return 'generated'
          if (id.includes('elkjs')) return 'elkjs'
          if (id.includes('lodash')) return 'lodash'
          if (id.includes('apollo')) return 'apollo'
          if (id.includes('design-system/src')) return 'design-system'
        },
      },
    },
  },
  resolve: {
    alias: {
      '@pluralsh/design-system': resolve(__dirname, './design-system/src'),
    },
  },
})
