import { useEffect, useMemo, useState } from 'react'
import { Button, LoopingLogo } from '@pluralsh/design-system'
import {
  Div,
  Flex,
  Form,
  P,
} from 'honorable'
import { useMutation, useQuery } from '@apollo/client'
import { Box, Text } from 'grommet'
import { v4 as uuidv4 } from 'uuid'
import gql from 'graphql-tag'
import { useIntercom } from 'react-use-intercom'
import { useLocation } from 'react-router-dom'

import { WelcomeHeader } from 'components/utils/WelcomeHeader'

import { GqlError } from '../utils/Alert'

import { setToken, wipeToken } from '../../helpers/auth'
import { localized } from '../../helpers/hostname'

import { ME_Q, SIGNIN } from '../graphql/users'
import { IncidentContext } from '../incidents/context'
import { LabelledInput } from '../utils/LabelledInput'
import { LoginContext } from '../contexts'
import { LoginPortal } from '../login/LoginPortal'

const POLL_INTERVAL = 3 * 60 * 1000
const CONSOLE_LOGO = '/console-logo.png'
const LOGIN_INFO = gql`
  query LoginInfo($redirect: String) {
    loginInfo(redirect: $redirect) {
      oidcUri
    }
  }
`

function LoginError({ error }) {
  useEffect(() => {
    const to = setTimeout(() => {
      wipeToken()
      window.location = '/login' as any as Location
    }, 2000)

    return () => clearTimeout(to)
  }, [])

  console.error(error)

  return (
    <LoginPortal>
      <LoopingLogo />
    </LoginPortal>
  )
}

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
          >
            Enter the login token given to you to gain access
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
            setToken(jwt)
            window.location = '/' as any as Location
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
    let item = {}

    try {
      item = JSON.parse(localStorage.getItem(FUDGED_USER) || '')
    }
    catch (e) {
      console.error('Error retrieving fudged user: ', e)
    }

    return item
  }

  const id = uuidv4()
  const randstr = Math.random().toString(36).slice(2)
  const user = { email: `sandbox+${randstr}@plural.sh`, name, userId: id }

  localStorage.setItem(FUDGED_USER, JSON.stringify(user))

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
  const { data, error, loading } = useQuery(ME_Q, {
    pollInterval: POLL_INTERVAL,
    errorPolicy: 'ignore',
  })
  const { boot, update } = useIntercom()

  useEffect(() => {
    if (data && data.me) boot(intercomAttributes(data.me))
  }, [boot, data])

  useEffect(() => {
    if (data?.me) {
      update()
    }
  }, [data, location, update])

  const {
    me,
    externalToken,
    clusterInfo: { __typename, ...clusterInformation },
    configuration,
  } = data

  const loginContextValue = useMemo(() => ({ me, configuration, token: externalToken }),
    [configuration, externalToken, me])

  if (error || (!loading && !data.clusterInfo)) {
    console.log(error)

    return <LoginError error={error} />
  }

  if (!data?.clusterInfo) return null

  return (
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    <IncidentContext.Provider value={{ clusterInformation }}>
      {/* eslint-disable-next-line react/jsx-no-constructed-context-values */}
      <LoginContext.Provider value={loginContextValue}>
        {children}
      </LoginContext.Provider>
    </IncidentContext.Provider>
  )
}

function OIDCLogin({ oidcUri }) {
  return (
    <LoginPortal>
      <Flex
        flexDirection="column"
        gap="xlarge"
      >
        <Flex
          flexDirection="column"
          gap="xsmall"
        >
          <WelcomeHeader />
          <P
            body1
            color="text-light"
          >
            Connect to your Plural account for access to this Console.
          </P>
        </Flex>
        <Button
          id="plrl-login"
          fill="horizontal"
          label=""
          onClick={() => {
            window.location = oidcUri
          }}
        >Login with Plural
        </Button>
      </Flex>
    </LoginPortal>
  )
}

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const { data } = useQuery(ME_Q)
  const { data: loginData } = useQuery(LOGIN_INFO, {
    variables: { redirect: localized('/oauth/callback') },
  })
  const [mutation, { loading, error }] = useMutation(SIGNIN, {
    variables: form,
    onCompleted: ({ signIn: { jwt } }) => {
      setToken(jwt)
      window.location = '/' as any as Location
    },
    onError: console.error,
  })

  if (!error && data && data.me) {
    window.location = '/' as any as Location
  }

  if (loginData && loginData.loginInfo && loginData.loginInfo.oidcUri) {
    return <OIDCLogin oidcUri={loginData.loginInfo.oidcUri} />
  }

  const disabled = form.password.length === 0 || form.email.length === 0
  const onSubmit = () => {
    if (disabled) {
      return
    }
    mutation()
  }

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
          >
            Enter your email and password to get started
          </Text>
        </Box>
        <Form onSubmit={onSubmit}>
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
              type="submit"
              fill="horizontal"
              label="Login"
              pad={{ vertical: '8px' }}
              margin={{ top: 'xsmall' }}
              loading={loading}
              disabled={disabled}
            />
          </Box>
        </Form>
      </Box>
    </LoginPortal>
  )
}
