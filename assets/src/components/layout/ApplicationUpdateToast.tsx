import { useCallback, useContext, useEffect, useState } from 'react'

import { LoginContext } from 'components/contexts'

import * as serviceWorker from '../../serviceWorkerRegistration'
import { Toast } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

const COMMIT_KEY = 'git-commit'

const DEFAULT_COMMIT = 'plural-default-commit'
const getCommit = () => sessionStorage.getItem(COMMIT_KEY) || DEFAULT_COMMIT
const setCommit = (sha) => sessionStorage.setItem(COMMIT_KEY, sha)

export function ApplicationUpdateToast() {
  const theme = useTheme()
  const { configuration: config } = useContext(LoginContext)
  const [stale, setStale] = useState(false)

  const reloadApplication = useCallback(() => {
    const promise = serviceWorker.unregister() || Promise.resolve('done')
    promise.then(() => {
      setCommit(config?.gitCommit)
      window.location.reload()
    })
  }, [config?.gitCommit])

  useEffect(() => {
    const current = getCommit()
    const next = config?.gitCommit

    if (!next) return

    if (current === DEFAULT_COMMIT) {
      setCommit(next)
      setStale(false)
      return
    }

    setStale(current !== next)
  }, [config?.gitCommit])

  return (
    <Toast
      show={stale}
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
