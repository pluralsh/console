import { RefObject, useEffect, useMemo, useRef, useState } from 'react'
import { Button, LoopingLogo } from '@pluralsh/design-system'
import { Div, Flex, Form, P } from 'honorable'
import { useMutation, useQuery } from '@apollo/client'
import { Box } from 'grommet'
import { v4 as uuidv4 } from 'uuid'
import gql from 'graphql-tag'
import { IntercomProps, useIntercom } from 'react-use-intercom'
import { useLocation } from 'react-router-dom'
import { WelcomeHeader } from 'components/utils/WelcomeHeader'
import { isValidEmail } from 'utils/email'
import { User, useMeQuery } from 'generated/graphql'
import { useHelpSpacing } from 'components/help/HelpLauncher'

import { GqlError } from '../utils/Alert'
import { setToken, wipeToken } from '../../helpers/auth'
import { localized } from '../../helpers/hostname'
import { ME_Q, SIGNIN } from '../graphql/users'
import { IncidentContext } from '../incidents/context'
import { LabelledInput } from '../utils/LabelledInput'
import { LoginContextProvider } from '../contexts'
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

function fudgedUser(name?: string): IntercomUser {
  let user: IntercomUser = {}

  if (localStorage.getItem(FUDGED_USER)) {
    let storedUser:
      | { email?: unknown; name?: unknown; userId?: unknown }
      | undefined
      | null = {}

    try {
      storedUser = JSON.parse(localStorage.getItem(FUDGED_USER) || '')
    } catch (e) {
      console.error('Error retrieving fudged user: ', e)
      storedUser = {}
    }
    const { name, email, userId } = storedUser || {}

    user = {
      ...(name && typeof name === 'string' ? { name } : {}),
      ...(email && typeof email === 'string' ? { email } : {}),
      ...(userId && typeof userId === 'string' ? { userId } : {}),
    }
  }

  const id = uuidv4()
  const randstr = Math.random().toString(36).slice(2)

  user = {
    email: user.email || `sandbox+${randstr}@plural.sh`,
    name: user.name || name || 'Demo User',
    userId: user.userId || id,
  }

  localStorage.setItem(FUDGED_USER, JSON.stringify(user))

  return user
}

type IntercomUser = Pick<IntercomProps, 'email' | 'name' | 'userId'>

function useIntercomAttributes(
  pluralUser: User | null | undefined
): IntercomProps | null | undefined {
  const helpSpacing = useHelpSpacing()

  if (!pluralUser) {
    return null
  }
  const { email, name, pluralId, id } = pluralUser
  let intercomUser: IntercomUser = {
    email,
    name,
    userId: pluralId || id,
  }

  if (intercomUser.email === 'demo-user@plural.sh') {
    intercomUser = fudgedUser(name)
  }

  return {
    hideDefaultLauncher: true,
    horizontalPadding: helpSpacing.padding.right,
    verticalPadding:
      helpSpacing.padding.bottom +
      helpSpacing.icon.height +
      helpSpacing.gap.vertical,
    ...intercomUser,
  }
}

export function EnsureLogin({ children }) {
  const location = useLocation()
  const { data, error, loading } = useMeQuery({
    pollInterval: POLL_INTERVAL,
    errorPolicy: 'ignore',
  })
  const { boot, update } = useIntercom()
  const intercomAttrs = useIntercomAttributes(data?.me)

  useEffect(() => {
    if (intercomAttrs) {
      boot(intercomAttrs)
    }
  }, [boot, intercomAttrs])

  useEffect(() => {
    if (data?.me) {
      update()
    }
  }, [data, location, update])

  const { me, externalToken, configuration } = data || {}

  const loginContextValue = useMemo(
    () => ({ me, configuration, token: externalToken }),
    [configuration, externalToken, me]
  )

  if (error || (!loading && !data?.clusterInfo)) {
    console.log(error)

    return <LoginError error={error} />
  }

  if (!data?.clusterInfo) return null
  const { __typename, ...clusterInformation } = data.clusterInfo

  console.log('login context in provider', loginContextValue)

  return (
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    <IncidentContext.Provider value={{ clusterInformation }}>
      <LoginContextProvider value={loginContextValue}>
        {children}
      </LoginContextProvider>
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
  const [loginMutation, { loading: loginMLoading, error: loginMError }] =
    useMutation(SIGNIN, {
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
  const onSubmit = (e) => {
    e.preventDefault()
    if (disabled) {
      return
    }
    loginMutation()
  }
  const passwordErrorMsg =
    loginMError?.message === 'invalid password' ? 'Invalid password' : undefined
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
              onChange={(email) => setForm({ ...form, email })}
              placeholder="Enter email address"
            />
            <LabelledInput
              label="Password"
              type="password"
              hint={passwordErrorMsg}
              error={!!passwordErrorMsg}
              value={form.password}
              onChange={(password) => setForm({ ...form, password })}
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
