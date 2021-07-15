import React, { useEffect, useState } from 'react'
import { GqlError } from 'forge-core' 
import { useQuery, useMutation } from 'react-apollo'
import { Box, Keyboard, Text, Form } from 'grommet'
import { Button } from 'forge-core'
import { setToken, wipeToken } from '../helpers/auth'
import { ME_Q, SIGNIN } from './graphql/users'
import { IncidentContext } from './incidents/context'
import gql from 'graphql-tag'
import { localized } from '../helpers/hostname'
import { LabelledInput } from './utils/LabelledInput'
import { useHistory } from 'react-router'

const POLL_INTERVAL = 3 * 60 * 1000
const CONSOLE_ICON = process.env.PUBLIC_URL + '/console-full.png'
const CONSOLE_LOGO = process.env.PUBLIC_URL + '/console-logo.png'
const LOGIN_INFO = gql`
  query LoginInfo($redirect: String) {
    loginInfo(redirect: $redirect) { oidcUri }
  }
`

export function LoginPortal({children}) {
  return (
    <Box height='100vh' fill='horizontal' direction='row'>
      <Box width='40%' fill='vertical' justify='center' align='center' background='plural-blk'>
        <img src={CONSOLE_ICON} width='300px' />
      </Box>
      <Box fill align='center' justify='center'>
        {children}
      </Box>
    </Box>
  )
}

export const LoginContext = React.createContext({me: null})

export function EnsureLogin({children}) {
  const {data, error} = useQuery(ME_Q, {pollInterval: POLL_INTERVAL})

  if (error) {
    wipeToken()
    window.location = '/login'
  }
  if (!data) return null

  const {me, externalToken, clusterInfo: {__typename, ...clusterInformation}} = data

  return (
    <IncidentContext.Provider value={{clusterInformation}}>
      <LoginContext.Provider value={{me, token: externalToken}}>
        {children}
      </LoginContext.Provider>
    </IncidentContext.Provider>
  )
}

function OIDCLogin({oidcUri}) {
  return (
    <LoginPortal>
      <Box gap='medium'>
        <Box gap='xsmall' align='center'>
          <img src={CONSOLE_LOGO} width='45px' />
          <Text size='large'>Welcome</Text>
          <Text size='small' color='dark-3'>It looks like this instance is using plural oauth</Text>
        </Box>
        <Button 
          fill='horizontal' 
          label='Login with Plural'
          onClick={() => { window.location = oidcUri }} />
      </Box>
    </LoginPortal>
  )
}

export default function Login() {
  const [form, setForm] = useState({email: '', password: ''})
  const {data} = useQuery(ME_Q)
  const {data: loginData} = useQuery(LOGIN_INFO, {variables: {redirect: localized('/oauth/callback')}})
  const [mutation, {loading, error}] = useMutation(SIGNIN, {
    variables: form,
    onCompleted: ({signIn: {jwt}}) => {
      setToken(jwt)
      window.location = '/'
    },
    onError: console.log
  })

  if (!error && data && data.me) {
    window.location = '/'
  }

  if (loginData && loginData.loginInfo && loginData.loginInfo.oidcUri) {
    return <OIDCLogin oidcUri={loginData.loginInfo.oidcUri} />
  }

  const disabled = form.password.length === 0 || form.email.length === 0

  return (
    <LoginPortal>
      <Box gap='medium'>
        <Box gap='xsmall' align='center'>
          <img src={CONSOLE_LOGO} width='45px' />
          <Text size='large'>Welcome</Text>
          <Text size='small' color='dark-3'>Enter your email and password to get started</Text>
        </Box>
        <Keyboard onEnter={disabled ? null : mutation}>
          <Form onSubmit={disabled ? null : mutation}>
            <Box margin={{bottom: '10px'}} gap='xsmall'>
              {error && <GqlError header='Login failed' error={error} />}
              <LabelledInput
                value={form.email}
                placeholder='someone@example.com'
                label='Email'
                onChange={(email) => setForm({...form, email})} />
              <LabelledInput
                type='password'
                value={form.password}
                placeholder='a long password'
                label='Password'
                onChange={(password) => setForm({...form, password})} />
              <Button 
                fill='horizontal'
                label='Login' 
                pad={{vertical: '8px'}} 
                margin={{top: 'xsmall'}}
                onClick={mutation} 
                loading={loading} 
                disabled={disabled} />
            </Box>
          </Form>
        </Keyboard>
      </Box>
    </LoginPortal>
  )
}