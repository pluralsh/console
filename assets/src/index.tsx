import { createRoot } from 'react-dom/client'

import './index.css'
import 'regenerator-runtime/runtime'
import posthog from 'posthog-js'

import App from './App'

// import * as serviceWorker from './serviceWorker'

const container = document.getElementById('root') as Element
const root = createRoot(container)

posthog.init('phc_r0v4jbKz8Rr27mfqgO15AN5BMuuvnU8hCFedd6zpSDy',
  {
    api_host: 'https://posthog.plural.sh',
    disable_session_recording: true,
    opt_out_capturing_by_default: true,
  })

root.render(<App />)

// TODO(floreks): Enable once fixed
// serviceWorker.register({})
