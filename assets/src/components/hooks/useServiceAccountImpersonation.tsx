import {
  getOriginalUserLabel,
  isImpersonatingServiceAccount,
  stopServiceAccountImpersonation,
} from 'helpers/impersonation'
import { useCallback, useState } from 'react'

export function useServiceAccountImpersonation(meEmail?: Nullable<string>) {
  const [restoring, setRestoring] = useState(false)
  const impersonating = isImpersonatingServiceAccount() || restoring

  const restoreSession = useCallback(() => {
    setRestoring(true)
    stopServiceAccountImpersonation()
    ;(window as Window).location.reload()

    return true
  }, [])

  return {
    impersonating,
    impersonatedEmail: meEmail,
    originalUserLabel: getOriginalUserLabel(),
    restoring,
    restoreSession,
  }
}
