import { createRoot } from 'react-dom/client'

import './index.css'

import * as Sentry from '@sentry/react'
import { StrictMode } from 'react'

import App from './App'
import PrototypeApp from './prototype/PrototypeApp'

const container = document.getElementById('root') as Element
const root = createRoot(container, {
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn('Uncaught error', error, errorInfo.componentStack)
  }),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
})

root.render(
  <StrictMode>
    {import.meta.env.VITE_UI_PROTOTYPE === 'true' ? <PrototypeApp /> : <App />}
  </StrictMode>
)
