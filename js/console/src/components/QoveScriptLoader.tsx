import { ReactNode, useEffect } from 'react'
import { useLogin } from './contexts'

const QOVE_SCRIPT_SRC = 'https://cdn.qove.ai/v1/sureship.js'
/** Marks scripts injected by the console SPA for cleanup/idempotency. */
const PLURAL_QOVE_MARKER = 'plural-qove-console'

export function QoveScriptLoader({ children }: { children: ReactNode }) {
  const { configuration } = useLogin()
  const qoveKey = configuration?.qoveKey?.trim() ?? ''

  useEffect(() => {
    if (!qoveKey) return

    const marker = `[data-${PLURAL_QOVE_MARKER}]`
    if (document.querySelector(marker)) return

    const script = document.createElement('script')
    script.src = QOVE_SCRIPT_SRC
    script.defer = true
    script.setAttribute('data-client-key', qoveKey)
    script.setAttribute(`data-${PLURAL_QOVE_MARKER}`, 'true')
    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [qoveKey])

  return <>{children}</>
}
