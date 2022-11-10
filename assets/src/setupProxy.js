// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createProxyMiddleware } = require('http-proxy-middleware')

const proxy = createProxyMiddleware({
  target: process.env.BASE_URL || 'https://console.plural.sh',
  changeOrigin: true,
  ws: true,
})

module.exports = app => {
  app.use('/v1', proxy)
  app.use('/gql', proxy)
  app.use('/socket', proxy)
}
