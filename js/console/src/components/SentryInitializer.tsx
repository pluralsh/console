import { ReactNode, useEffect } from 'react'
import { useLogin } from './contexts'
import { initializeSentry } from '../instrument'

export function SentryInitializer({ children }: { children: ReactNode }) {
  const { configuration } = useLogin()
  useEffect(() => {
    initializeSentry(!!configuration?.sentryEnabled)
  }, [configuration?.sentryEnabled])

  return <>{children}</>
}
