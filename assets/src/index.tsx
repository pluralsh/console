import { createRoot } from 'react-dom/client'

import './index.css'
import 'regenerator-runtime/runtime'

import { StrictMode } from 'react'

import App from './App'

// import * as serviceWorker from './serviceWorker'

const container = document.getElementById('root') as Element
const root = createRoot(container)

root.render(
  <StrictMode>
    <App />
  </StrictMode>
)

// TODO(floreks): Enable once fixed
// serviceWorker.register({})
