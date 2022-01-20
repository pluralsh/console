import React, { useContext, useState, useCallback } from 'react'
import * as serviceWorker from '../serviceWorker';
import { LoginContext } from './Login'
import { ModalHeader, Alert, AlertStatus, Divider, Button, Download } from 'forge-core'
import { Anchor, Box, Layer, Text } from 'grommet';
import { Icon } from './Console'

const COMMIT_KEY = 'git-commit'
const DOC_LINK = 'https://docs.plural.sh/getting-started/admin-console#2.-setup-for-git-authentication'

const getCommit = () => localStorage.getItem(COMMIT_KEY) || 'example'
const setCommit = (sha) => localStorage.setItem(COMMIT_KEY, sha)

function GitStatus({setOpen}) {
  const {configuration: config} = useContext(LoginContext)
  const close = useCallback(() => setOpen(false), [setOpen])
  return (
    <Layer modal onEsc={close} onClickOutside={close}>
      <Box width='50vw'>
        <ModalHeader text='Git Error' setOpen={setOpen} />
        <Box pad='small' gap='small'>
          <Alert 
            status={AlertStatus.ERROR} 
            header='Git failed to clone locally' 
            description='the git credentials you provided are incorrect, or an internal error occurred'
          />
          <Divider text='Output' />
          <Box pad='small' background='tone-light'>
            <pre>
              {config.gitStatus.output || 'no output captured'}
            </pre>
          </Box>
          <Box pad='small' direction='row' justify='end' align='center' gap='xsmall'>
            <Box direction='row' fill='horizontal' align='center' gap='xsmall'>
              <Text size='small'>you can find more docs on configuring the console and git</Text>
              <Anchor href={DOC_LINK} target='_blank'>here</Anchor>
            </Box>
            <Button label='Close' onClick={close} />
          </Box>
        </Box>
      </Box>
    </Layer>
  )
}

export function AutoRefresh() {
  const [git, setGit] = useState(true)
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
      window.location.reload()
    }
  })

  const stale = getCommit() !== config.gitCommit

  if (getCommit() === 'example') {
    setCommit(config.gitCommit)
    return null
  }

  if (git && !config.gitStatus.cloned) {
    return <GitStatus setOpen={setGit} />
  }

  if (!stale) return null

  return (
    <Box margin={{horizontal: 'xxsmall'}}>
      <Icon
        icon={<Download size='15px' color='orange' />}
        onClick={reload}
        text='New Update Available'
        align={{top: 'bottom'}} />
    </Box>
  )
}