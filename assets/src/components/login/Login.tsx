import {
  RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Button, LoopingLogo } from '@pluralsh/design-system'
import {
  Div,
  Flex,
  Form,
  P,
} from 'honorable'
import { useMutation, useQuery } from '@apollo/client'
import { Box } from 'grommet'
import { v4 as uuidv4 } from 'uuid'
import gql from 'graphql-tag'
import { useIntercom } from 'react-use-intercom'
import { useLocation } from 'react-router-dom'

import { WelcomeHeader } from 'components/utils/WelcomeHeader'

import { isValidEmail } from 'utils/email'

import { GqlError } from '../utils/Alert'

import { setToken, wipeToken } from '../../helpers/auth'
import { localized } from '../../helpers/hostname'

import { ME_Q, SIGNIN } from '../graphql/users'
import { IncidentContext } from '../incidents/context'
import { LabelledInput } from '../utils/LabelledInput'
import { LoginContext } from '../contexts'
import { LoginPortal } from '../login/LoginPortal'

// 30 seconds
const POLL_INTERVAL = 30 * 1000
const LOGIN_INFO = gql`
  query LoginInfo($redirect: String) {
    loginInfo(redirect: $redirect) {
      oidcUri
    }
  }
`

const setInputFocus = (ref: RefObject<any>) => {
  requestAnimationFrame(() => {
    ref.current?.querySelector('input')?.focus()
  })
}

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
      <Div marginBottom="large">
        <WelcomeHeader
          textAlign="left"
          marginBottom="xxsmall"
        />
        <P
          body1
          color="text-xlight"
        >
          Enter the login token given to you to gain access
        </P>
      </Div>
      <LabelledInput
        value={jwt}
        width="100%"
        label="Login Token"
        onChange={setJwt}
      />
      <Button
        fill="horizontal"
        pad={{ vertical: '8px' }}
        margin={{ top: 'xsmall' }}
        onClick={() => {
          setToken(jwt)
          window.location = '/' as any as Location
        }}
        disabled={jwt === ''}
      >
        Get access
      </Button>
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
    if (data?.me) boot(intercomAttributes(data.me))
  }, [boot, data])

  useEffect(() => {
    if (data?.me) {
      update()
    }
  }, [data, location, update])

  const { me, externalToken, configuration } = data || {}

  const loginContextValue = useMemo(() => ({ me, configuration, token: externalToken }),
    [configuration, externalToken, me])

  if (error || (!loading && !data.clusterInfo)) {
    console.log(error)

    return <LoginError error={error} />
  }

  if (!data?.clusterInfo) return null
  const { __typename, ...clusterInformation } = data.clusterInfo

  return (
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    <IncidentContext.Provider value={{ clusterInformation }}>
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
            textAlign="center"
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
        >
          Log in with Plural
        </Button>
      </Flex>
    </LoginPortal>
  )
}

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const emailRef = useRef<any>()

  useEffect(() => {
    setInputFocus(emailRef)
  }, [])

  const { data } = useQuery(ME_Q)
  const { data: loginData } = useQuery(LOGIN_INFO, {
    variables: { redirect: localized('/oauth/callback') },
  })
  const [loginMutation, { loading: loginMLoading, error: loginMError }]
    = useMutation(SIGNIN, {
      variables: form,
      onCompleted: ({ signIn: { jwt } }) => {
        setToken(jwt)
        window.location = '/' as any as Location
      },
      onError: console.error,
    })

  if (!loginMError && data?.me) {
    window.location = '/' as any as Location
  }

  if (loginData && loginData.loginInfo && loginData.loginInfo.oidcUri) {
    return <OIDCLogin oidcUri={loginData.loginInfo.oidcUri} />
  }

  const disabled = form.password.length === 0 || !isValidEmail(form.email)
  const onSubmit = e => {
    e.preventDefault()
    if (disabled) {
      return
    }
    loginMutation()
  }
  const passwordErrorMsg
    = loginMError?.message === 'invalid password' ? 'Invalid password' : undefined
  const loginError = !passwordErrorMsg && loginMError

  return (
    <LoginPortal>
      <WelcomeHeader marginBottom="xlarge" />
      <Form onSubmit={onSubmit}>
        <Box
          margin={{ bottom: '10px' }}
          gap="xsmall"
        >
          {loginMError && (
            <Div marginBottom="large">
              <GqlError
                header="Login failed"
                error={loginError}
              />
            </Div>
          )}
          <Flex
            flexDirection="column"
            gap="small"
            marginBottom="small"
          >
            <LabelledInput
              ref={emailRef}
              label="Email address"
              value={form.email}
              onChange={email => setForm({ ...form, email })}
              placeholder="Enter email address"
            />
            <LabelledInput
              label="Password"
              type="password"
              hint={passwordErrorMsg}
              error={!!passwordErrorMsg}
              value={form.password}
              onChange={password => setForm({ ...form, password })}
              placeholder="Enter password"
            />
          </Flex>
          <Button
            type="submit"
            fill="horizontal"
            pad={{ vertical: '8px' }}
            margin={{ top: 'xsmall' }}
            loading={loginMLoading}
            disabled={disabled}
          >
            Log in
          </Button>
        </Box>
      </Form>
    </LoginPortal>
  )
}
