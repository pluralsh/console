import { LoginContext } from 'components/contexts'
import { useContext } from 'react'

/** Git commit baked into the deployed frontend bundle. */
export const BUNDLED_GIT_COMMIT = import.meta.env.VITE_GIT_COMMIT

export function reloadApplicationUpdate() {
  window.location.reload()
}

/** Same gate as the former `ApplicationUpdateToast` (prod only). */
export function isProductionConsole(): boolean {
  return import.meta.env.MODE === 'production'
}

/** True when the API reports a newer console frontend than this bundle. */
export function useApplicationUpdateAvailable(): boolean {
  const { configuration } = useContext(LoginContext)
  const serverCommit = configuration?.gitCommit

  return (
    isProductionConsole() &&
    !!serverCommit &&
    serverCommit !== BUNDLED_GIT_COMMIT
  )
}
