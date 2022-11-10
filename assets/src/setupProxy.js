import { createProxyMiddleware } from 'http-proxy-middleware'

const proxy = createProxyMiddleware({
  target: process.env.BASE_URL || 'https://console.plural.sh',
  changeOrigin: true,
  ws: true,
})

export default app => {
  app.use('/v1', proxy)
  app.use('/gql', proxy)
  app.use('/socket', proxy)
}
