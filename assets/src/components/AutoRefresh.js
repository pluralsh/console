import React, { useContext, useState, useCallback } from 'react'
import * as serviceWorker from '../serviceWorker';
import { LoginContext } from './Login'
import { Confirm } from 'forge-core'

const COMMIT_KEY = 'git-commit'

const getCommit = () => localStorage.getItem(COMMIT_KEY) || 'example'
const setCommit = (sha) => localStorage.setItem(COMMIT_KEY, sha)

export function AutoRefresh() {
  const [open, setOpen] = useState(true)
  const {configuration: config} = useContext(LoginContext)
  const reload = useCallback(() => {
    console.log('reloading')
    if (process.env.NODE_ENV === 'production') {
      const promise = serviceWorker.unregister() || Promise.resolve('done')
      promise.then(() => {
        setCommit(config.gitCommit)
        window.location.reload()
      })
    } else {
      setCommit(config.gitCommit)
      setOpen(false)
    }
  })

  const stale = getCommit() !== config.gitCommit

  if (!stale || !open) return null

  if (getCommit() === 'example') {
    setCommit(config.gitCommit)
    return null
  }

  return (
    <Confirm
      submit={reload}
      cancel={() => setOpen(false)}
      header='New version available'
      label='Reboot'
      description="It looks like there's a new version of plural available to use" />
  )
}