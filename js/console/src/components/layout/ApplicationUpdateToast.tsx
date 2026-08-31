import { useContext } from 'react'

import { LoginContext } from 'components/contexts'

import { Toast } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

const BUNDLED_GIT_COMMIT = import.meta.env.VITE_GIT_COMMIT

export function ApplicationUpdateToast() {
  const theme = useTheme()
  const { configuration: config } = useContext(LoginContext)
  console.log(
    `Current git commit for frontend: ${BUNDLED_GIT_COMMIT}, server: ${config?.gitCommit}`
  )

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
        onClick={() => window.location.reload()}
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
