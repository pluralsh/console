import { ReactNode, useEffect } from 'react'
import { useLogin } from './contexts'

const QOVE_SCRIPT_SRC = 'https://cdn.qove.ai/v1/sureship.js'
/** Marks scripts injected by the console SPA for cleanup/idempotency. */
const PLURAL_QOVE_MARKER = 'plural-qove-console'

export function QoveScriptLoader({
  children,
  qoveKey: qoveKeyProp,
}: {
  children?: ReactNode
  qoveKey?: string | null
}) {
  const { configuration } = useLogin()
  const qoveKey = (qoveKeyProp ?? configuration?.qoveKey)?.trim() ?? ''

  useEffect(() => {
    if (!qoveKey) return

    const marker = `script[data-${PLURAL_QOVE_MARKER}]`
    const existing = document.querySelector<HTMLScriptElement>(marker)
    if (existing) {
      if (existing.getAttribute('data-client-key') !== qoveKey) {
        existing.setAttribute('data-client-key', qoveKey)
      }
      return
    }

    const script = document.createElement('script')
    script.src = QOVE_SCRIPT_SRC
    script.async = true
    script.setAttribute('data-client-key', qoveKey)
    script.setAttribute(`data-${PLURAL_QOVE_MARKER}`, 'true')
    document.head.appendChild(script)
  }, [qoveKey])

  return <>{children}</>
}
