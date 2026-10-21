import path from 'path'

import type { NextConfig } from 'next'

import { redirects } from './src/routing/docs-structure'

const nextConfig: NextConfig = {
  output: 'standalone',
  // Trace from the yarn workspace root so hoisted deps and the design system
  // land in .next/standalone.
  outputFileTracingRoot: path.join(__dirname, '..'),
  // layout-elk is ESM-only; bundling it avoids a require() of its import-only exports on the server.
  transpilePackages: ['@pluralsh/design-system', '@mermaid-js/layout-elk'],
  reactStrictMode: false,
  // fail the build instead of silently skipping components the compiler can't handle
  reactCompiler: { panicThreshold: 'all_errors' },
  compiler: {
    // https://nextjs.org/docs/advanced-features/compiler#styled-components
    styledComponents: true,
    emotion: true,
  },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  async redirects() {
    return redirects
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
        ],
      },
    ]
  },
}

export default nextConfig
