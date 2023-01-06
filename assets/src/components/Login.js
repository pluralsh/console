import React, { useEffect, useState } from 'react'
import { Button, GqlError } from 'forge-core'
import { useMutation, useQuery } from 'react-apollo'
import { Box, Form, Keyboard, Text } from 'grommet'

import { v4 as uuidv4 } from 'uuid'

import gql from 'graphql-tag'

import { useIntercom } from 'react-use-intercom'

import { useLocation } from 'react-router'

import { setToken, wipeToken } from '../helpers/auth'

import { localized } from '../helpers/hostname'

import { ME_Q, SIGNIN } from './graphql/users'
import { IncidentContext } from './incidents/context'
import { LabelledInput } from './utils/LabelledInput'

import { LoopingLogo } from './utils/AnimatedLogo'

const POLL_INTERVAL = 3 * 60 * 1000
const CONSOLE_ICON = `${process.env.PUBLIC_URL}/console-full.png`
const CONSOLE_LOGO = `${process.env.PUBLIC_URL}/console-logo.png`
const LOGIN_INFO = gql`
  query LoginInfo($redirect: String) {
    loginInfo(redirect: $redirect) { oidcUri }
  }
`

export function LoginPortal({ children }) {
  return (
    <Box
      height="100vh"
      fill="horizontal"
      direction="row"
    >
      <Box
        width="40%"
        fill="vertical"
        justify="center"
        align="center"
        background="plural-blk"
      >
        <img
          src={CONSOLE_ICON}
          width="300px"
        />
      </Box>
      <Box
        fill
        align="center"
        justify="center"
      >
        {children}
      </Box>
    </Box>
  )
}

function LoginError({ error }) {
  useEffect(() => {
    const to = setTimeout(() => {
      wipeToken()
      window.location = '/login'
    }, 2000)

    return () => clearTimeout(to)
  }, [])

  console.log(error)

  return (
    <LoginPortal>
      <LoopingLogo />
    </LoginPortal>
  )
}

export const LoginContext = React.createContext({ me: null })

export function GrantAccess() {
  const [jwt, setJwt] = useState('')

  return (
    <LoginPortal>
      <Box gap="small">
        <Box
          gap="xsmall"
          align="center"
        >
          <img
            src={CONSOLE_LOGO}
            width="45px"
          />
          <Text size="large">Welcome</Text>
          <Text
            size="small"
            color="dark-3"
          >Enter the login token given to you to gain access
          </Text>
        </Box>
        <LabelledInput
          value={jwt}
          width="100%"
          label="Login Token"
          onChange={setJwt}
        />
        <Button
          fill="horizontal"
          label="Get Access"
          pad={{ vertical: '8px' }}
          margin={{ top: 'xsmall' }}
          onClick={() => {
            setToken(jwt); window.location = '/'
          }}
          disabled={jwt === ''}
        />
      </Box>
    </LoginPortal>
  )
}

const FUDGED_USER = 'plrl-fudged-user'

function fudgedUser(name) {
  if (localStorage.getItem(FUDGED_USER)) {
    return localStorage.getItem(FUDGED_USER)
  }

  const id = uuidv4()
  const randstr = Math.random().toString(36).slice(2)
  const user = { email: `sandbox+${randstr}@plural.sh`, name, userId: id }
  localStorage.setItem(FUDGED_USER, user)

  return user
}

function intercomAttributes({ email, name }) {
  if (email === 'demo-user@plural.sh') { 
    console.log('here')

    return fudgedUser(name)
  }

  return { email, name }
}

export function EnsureLogin({ children }) {
  const location = useLocation()
  const { data, error, loading } = useQuery(ME_Q, { pollInterval: POLL_INTERVAL, errorPolicy: 'ignore' })
  const { boot, update } = useIntercom()

  useEffect(() => {
    if (data && data.me) boot(intercomAttributes(data.me))
  }, [data])

  useEffect(() => {
    if (data && data.me) update()
  }, [data, location])

  if (error || (!loading && !data.clusterInfo)) {
    console.log(error)

    return <LoginError error={error} />
  }

  if (!data?.clusterInfo) return null

  const { me, externalToken, clusterInfo: { __typename, ...clusterInformation }, configuration } = data

  return (
    <IncidentContext.Provider value={{ clusterInformation }}>
      <LoginContext.Provider value={{ me, configuration, token: externalToken }}>
        {children}
      </LoginContext.Provider>
    </IncidentContext.Provider>
  )
}

function OIDCLogin({ oidcUri }) {
  return (
    <LoginPortal>
      <Box gap="medium">
        <Box
          gap="xsmall"
          align="center"
        >
          <img
            src={CONSOLE_LOGO}
            width="45px"
          />
          <Text size="large">Welcome</Text>
          <Text
            size="small"
            color="dark-3"
          >It looks like this instance is using plural oauth
          </Text>
        </Box>
        <Button
          id="plrl-login"
          fill="horizontal"
          label="Login with Plural"
          onClick={() => {
            window.location = oidcUri
          }}
        />
      </Box>
    </LoginPortal>
  )
}

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const { data } = useQuery(ME_Q)
  const { data: loginData } = useQuery(LOGIN_INFO, { variables: { redirect: localized('/oauth/callback') } })
  const [mutation, { loading, error }] = useMutation(SIGNIN, {
    variables: form,
    onCompleted: ({ signIn: { jwt } }) => {
      setToken(jwt)
      window.location = '/'
    },
    onError: console.log,
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
      <Box gap="medium">
        <Box
          gap="xsmall"
          align="center"
        >
          <img
            src={CONSOLE_LOGO}
            width="45px"
          />
          <Text size="large">Welcome</Text>
          <Text
            size="small"
            color="dark-3"
          >Enter your email and password to get started
          </Text>
        </Box>
        <Keyboard onEnter={disabled ? null : mutation}>
          <Form onSubmit={disabled ? null : mutation}>
            <Box
              margin={{ bottom: '10px' }}
              gap="xsmall"
            >
              {error && (
                <GqlError
                  header="Login failed"
                  error={error}
                />
              )}
              <LabelledInput
                value={form.email}
                placeholder="someone@example.com"
                label="Email"
                onChange={email => setForm({ ...form, email })}
              />
              <LabelledInput
                type="password"
                value={form.password}
                placeholder="a long password"
                label="Password"
                onChange={password => setForm({ ...form, password })}
              />
              <Button
                fill="horizontal"
                label="Login"
                pad={{ vertical: '8px' }}
                margin={{ top: 'xsmall' }}
                onClick={mutation}
                loading={loading}
                disabled={disabled}
              />
            </Box>
          </Form>
        </Keyboard>
      </Box>
    </LoginPortal>
  )
}
