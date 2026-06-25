import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import http from 'node:http'
import https from 'node:https'
import { resolve } from 'path'
import { defineConfig, type ViteDevServer } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const API_URL = process.env.BASE_URL
  ? `https://${process.env.BASE_URL}`
  : 'https://console.plural.sh'
const WS_URL = process.env.BASE_URL
  ? `wss://${process.env.BASE_URL}`
  : 'wss://console.plural.sh'

function objectStoreProxyPlugin() {
  return {
    name: 'object-store-proxy',
    apply: 'serve' as const,
    configureServer(server: ViteDevServer) {
      server.middlewares.use((
        req: http.IncomingMessage,
        res: http.ServerResponse,
        next: () => void
      ) => {
        if (req.url?.startsWith('/__object_store/fetch-shim.js')) {
          res.setHeader('Content-Type', 'application/javascript')
          return res.end(
            'const f=fetch.bind(window);window.fetch=(i,n)=>{try{const r=new URL(typeof i=="string"?i:i.url);if(r.origin!==location.origin&&/localhost|127\\.0\\.0\\.1|localstack|amazonaws|blob\\.core\\.windows\\.net|X-Amz-|sig=/i.test(r.hostname+r.search))return f("/__object_store/"+r.host+r.pathname+r.search,n)}catch{}return f(i,n)}'
          )
        }

        if (!req.url?.startsWith('/__object_store/')) return next()

        const requestPath = req.url.slice('/__object_store/'.length)
        const pathStart = requestPath.indexOf('/')

        if (pathStart < 0) {
          res.statusCode = 400
          res.end('Invalid object store proxy URL')
          return
        }

        const signedHost = requestPath.slice(0, pathStart)
        const targetPath = requestPath.slice(pathStart)
        const connectHost = signedHost.replace(/^localstack/i, 'localhost')
        const target = new URL(
          /localhost|127\.0\.0\.1|localstack/i.test(connectHost)
            ? `http://${connectHost}`
            : `https://${connectHost}`
        )
        const client = target.protocol === 'https:' ? https : http
        const headers: http.OutgoingHttpHeaders = Object.fromEntries(
          Object.entries(req.headers).filter(([name]) => !name.startsWith(':'))
        )

        headers.host = signedHost

        const proxyReq = client.request(
          {
            protocol: target.protocol,
            hostname: target.hostname,
            port: target.port || undefined,
            method: req.method,
            path: targetPath,
            headers,
          },
          (proxyRes) => {
            res.writeHead(
              proxyRes.statusCode ?? 502,
              Object.fromEntries(
                Object.entries(proxyRes.headers).filter(
                  ([name]) =>
                    ![
                      'transfer-encoding',
                      'connection',
                      'keep-alive',
                      'upgrade',
                      'proxy-connection',
                    ].includes(name.toLowerCase())
                )
              )
            )
            proxyRes.pipe(res)
          }
        )

        proxyReq.on('error', (err: NodeJS.ErrnoException) => {
          res.statusCode = 502
          res.end(`Object store proxy failed: ${err.code ?? err.message}`)
        })

        if (req.method === 'GET' || req.method === 'HEAD') proxyReq.end()
        else req.pipe(proxyReq)
      })
    },
    transformIndexHtml: (html: string) =>
      html.replace(
        '<head>',
        '<head><script src="/__object_store/fetch-shim.js"></script>'
      ),
  }
}

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
    objectStoreProxyPlugin(),
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
