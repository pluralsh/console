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

// Dev-only object-store proxy and agent run download shim for local dev.
const objectStoreDevProxy = {
  name: 'object-store-dev-proxy',
  apply: 'serve' as const,
  configureServer({ middlewares }) {
    const pipe = (res: import('node:http').ServerResponse, r: Response) => {
      res.writeHead(r.status, {
        'content-type':
          r.headers.get('content-type') ?? 'application/octet-stream',
      })
      if (r.body) {
        Readable.fromWeb(r.body as import('stream/web').ReadableStream).pipe(
          res
        )
        return
      }
      res.end()
    }
    const remote = (href: string, host?: string) => {
      const u = new URL(href.startsWith('http') ? href : `https://${href}`)
      const h = (host ?? u.host).replace(/^localstack/i, 'localhost')
      const base = /localhost|127\.0\.0\.1|localstack/i.test(h)
        ? `http://${h}`
        : `https://${host ?? u.host}`
      return fetch(`${base}${u.pathname}${u.search}`, {
        headers: { host: host ?? u.host },
      })
    }

    middlewares.use(async (req, res, next) => {
      if (req.url === '/__object_store/fetch-shim.js') {
        res.setHeader('Content-Type', 'application/javascript')
        return res.end(
          'const f=fetch.bind(window);window.fetch=(i,n)=>{try{const r=new URL(typeof i=="string"?i:i.url);if(r.origin!==location.origin&&/localhost|127\\.0\\.0\\.1|localstack|amazonaws|blob\\.core\\.windows\\.net|X-Amz-|sig=/i.test(r.hostname+r.search))return f("/__object_store/"+r.host+r.pathname+r.search,n)}catch{}return f(i,n)}'
        )
      }

      const path = req.url?.split('?')[0] ?? ''
      const dl = path.match(
        /^\/v1\/api\/ai\/runs\/([^/]+)\/downloads\/(patch|session|screen_recording)$/
      )

      if (dl && req.method === 'GET') {
        try {
          const auth = req.headers.authorization
          const upstream = await fetch(`${API_URL}${path}`, {
            headers: auth ? { Authorization: auth } : {},
          })
          if (
            upstream.ok &&
            !(upstream.headers.get('content-type') ?? '').includes('text/html')
          ) {
            return pipe(res, upstream)
          }

          const { data, errors } = await fetch(`${API_URL}/gql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(auth ? { Authorization: auth } : {}),
            },
            body: JSON.stringify({
              query:
                'query($id:ID!){agentRun(id:$id){upload{patch session screenRecording}}}',
              variables: { id: dl[1] },
            }),
          }).then((r) => r.json())
          const field = dl[2] === 'screen_recording' ? 'screenRecording' : dl[2]
          const upload = data?.agentRun?.upload?.[field]
          if (errors?.length || !upload) throw new Error()

          return pipe(res, await remote(upload))
        } catch {
          return res.writeHead(502).end()
        }
      }

      if (!path.startsWith('/__object_store/')) return next()

      const [host, ...rest] = path.slice('/__object_store/'.length).split('/')
      if (!host || !rest.length) return res.writeHead(400).end()

      try {
        pipe(res, await remote(`https://${host}/${rest.join('/')}`, host))
      } catch {
        res.writeHead(502).end()
      }
    })
  },
  transformIndexHtml: (html) =>
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
