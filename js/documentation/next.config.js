// allows us to read the redirects object from the ts file
const path = require('path')

require('ts-node').register({
  compilerOptions: {
    module: 'commonjs',
    target: 'es2017',
  },
})

const { redirects } = require('./src/routing/docs-structure')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Trace from the yarn workspace root so hoisted deps and the design system
  // land in .next/standalone.
  outputFileTracingRoot: path.join(__dirname, '..'),
  // layout-elk is ESM-only; bundling it avoids a require() of its import-only exports on the server.
  transpilePackages: ['@pluralsh/design-system', '@mermaid-js/layout-elk'],
  reactStrictMode: false,
  // Linting runs via Biome in the build:next script and the js-ci Lint job.
  eslint: { ignoreDuringBuilds: true },
  compiler: {
    // https://nextjs.org/docs/advanced-features/compiler#styled-components
    styledComponents: true,
    emotion: true,
  },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  webpack: (config) => {
    // Share the theme context with design-system sources across workspaces.
    config.resolve.alias['styled-components'] =
      require.resolve('styled-components')
    config.resolve.alias['@pluralsh/design-system'] = path.resolve(
      __dirname,
      '../design-system/src/index.ts'
    )

    config.module.rules.push({
      test: /\.md$/,
      use: 'raw-loader',
    })

    return config
  },
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

module.exports = nextConfig
