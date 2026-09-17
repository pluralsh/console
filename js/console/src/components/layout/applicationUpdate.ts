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

/** Dev-only: set `VITE_PREVIEW_APPLICATION_UPDATE=true` in `.env` to review sidebar UI. */
export function isApplicationUpdatePreviewEnabled(): boolean {
  return (
    import.meta.env.DEV &&
    import.meta.env.VITE_PREVIEW_APPLICATION_UPDATE === 'true'
  )
}

/** True when the API reports a newer console frontend than this bundle. */
export function useApplicationUpdateAvailable(): boolean {
  const { configuration } = useContext(LoginContext)
  const serverCommit = configuration?.gitCommit

  if (isApplicationUpdatePreviewEnabled()) {
    return true
  }

  return (
    isProductionConsole() &&
    !!serverCommit &&
    serverCommit !== BUNDLED_GIT_COMMIT
  )
}
