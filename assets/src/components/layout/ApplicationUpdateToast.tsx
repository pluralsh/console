import { useContext } from 'react'

import { LoginContext } from 'components/contexts'

import { Toast } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import * as serviceWorker from '../../serviceWorkerRegistration'

const BUNDLED_GIT_COMMIT = import.meta.env.VITE_GIT_COMMIT

export function ApplicationUpdateToast() {
  const theme = useTheme()
  const { configuration: config } = useContext(LoginContext)

  return (
    <Toast
      show={!!config?.gitCommit && config?.gitCommit !== BUNDLED_GIT_COMMIT}
      closeTimeout="none"
      severity="info"
      marginBottom="medium"
      marginRight="xxxxlarge"
    >
      <span css={{ marginRight: theme.spacing.small }}>
        Time for a new update!
      </span>
      <a
        onClick={() => reloadApplication()}
        style={{
          textDecoration: 'none',
          cursor: 'pointer',
          color: theme.colors['action-link-inline'],
        }}
      >
        Update now
      </a>
    </Toast>
  )
}

const reloadApplication = () => {
  const promise = serviceWorker.unregister() || Promise.resolve('done')
  promise.then(() => {
    window.location.reload()
  })
}
