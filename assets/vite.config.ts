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

const UPLOAD_FIELDS = {
  patch: 'patch',
  session: 'session',
  screen_recording: 'screenRecording',
} as const

type UploadDownloadName = keyof typeof UPLOAD_FIELDS

function objectStoreTarget(host: string): string {
  const connectHost = host.replace(/^localstack/i, 'localhost')

  if (/localhost|127\.0\.0\.1|localstack/i.test(connectHost)) {
    return `http://${connectHost}`
  }

  return `https://${host}`
}

async function fetchObjectStoreUrl(url: string) {
  const parsed = new URL(url)

  return fetch(
    `${objectStoreTarget(parsed.host)}${parsed.pathname}${parsed.search}`,
    { headers: { host: parsed.host } }
  )
}

function pipeFetchResponse(
  upstream: Response,
  res: import('node:http').ServerResponse
) {
  res.writeHead(upstream.status, {
    'content-type':
      upstream.headers.get('content-type') ?? 'application/octet-stream',
  })

  if (upstream.body) {
    Readable.fromWeb(
      upstream.body as import('stream/web').ReadableStream
    ).pipe(res)
    return
  }

  res.end()
}

async function resolveAgentRunUploadUrl(
  runId: string,
  name: UploadDownloadName,
  authorization: string | undefined
) {
  const response = await fetch(`${API_URL}/gql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify({
      query: `query AgentRunUploadUrls($id: ID!) {
        agentRun(id: $id) {
          upload {
            patch
            session
            screenRecording
          }
        }
      }`,
      variables: { id: runId },
    }),
  })

  if (!response.ok) {
    throw new Error(`upload lookup failed with status ${response.status}`)
  }

  const payload = (await response.json()) as {
    data?: {
      agentRun?: {
        upload?: {
          patch?: string
          session?: string
          screenRecording?: string
        }
      }
    }
    errors?: unknown[]
  }

  if (payload.errors?.length) {
    throw new Error('upload lookup failed')
  }

  const field = UPLOAD_FIELDS[name]
  const url = payload.data?.agentRun?.upload?.[field]

  if (!url) {
    throw new Error(`no ${name} upload found for this run`)
  }

  return url
}

// Dev-only: signed object-store URLs (S3, Azure, localstack) are cross-origin from
// localhost, so direct fetch() fails on CORS. A shim rewrites those requests to
// /__object_store/... and this middleware proxies them server-side. Also shims the
// agent run download API when the proxied backend has not deployed it yet.
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

      const pathname = req.url?.split('?')[0] ?? ''
      const downloadMatch = pathname.match(
        /^\/v1\/api\/ai\/runs\/([^/]+)\/downloads\/(patch|session|screen_recording)$/
      )

      if (downloadMatch && req.method === 'GET') {
        const runId = downloadMatch[1]
        const name = downloadMatch[2] as UploadDownloadName
        const authorization = req.headers.authorization

        try {
          const upstream = await fetch(`${API_URL}${pathname}`, {
            headers: authorization ? { Authorization: authorization } : {},
          })
          const contentType = upstream.headers.get('content-type') ?? ''

          if (upstream.ok && !contentType.includes('text/html')) {
            return pipeFetchResponse(upstream, res)
          }

          const uploadUrl = await resolveAgentRunUploadUrl(
            runId,
            name,
            authorization
          )
          const upload = await fetchObjectStoreUrl(uploadUrl)

          return pipeFetchResponse(upload, res)
        } catch {
          return res.writeHead(502).end()
        }
      }

      if (!req.url?.startsWith('/__object_store/')) return next()
      const [host, ...path] = req.url
        .slice('/__object_store/'.length)
        .split('/')
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
        if (r.body) {
          Readable.fromWeb(
            r.body as import('stream/web').ReadableStream
          ).pipe(res)
        } else {
          res.end()
        }
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
