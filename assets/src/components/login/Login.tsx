import {
  ApolloError,
  useApolloClient,
  useMutation,
  useQuery,
} from '@apollo/client'
import { Button, Flex, LoopingLogo } from '@pluralsh/design-system'
import { WelcomeHeader } from 'components/utils/WelcomeHeader'
import { AcceptLoginDocument, useMeQuery, User } from 'generated/graphql'
import gql from 'graphql-tag'
import queryString from 'query-string'
import { RefObject, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { isValidEmail } from 'utils/email'

import { useTheme } from 'styled-components'

import {
  fetchToken,
  saveChallenge,
  setRefreshToken,
  setToken,
  wipeChallenge,
} from '../../helpers/auth'
import { localized } from '../../helpers/hostname'
import { LoginContextProvider } from '../contexts'
import { ME_Q, SIGNIN } from '../graphql/users'

import { GqlError } from '../utils/Alert'
import { LabelledInput } from '../utils/LabelledInput'
import LoadingIndicator from '../utils/LoadingIndicator'
import ShowAfterDelay from '../utils/ShowAfterDelay'

import { Body1P } from 'components/utils/typography/Text'
import { getLoginReturnPath, logoutWithReturnTo } from 'helpers/refreshToken'
import { LoginPortal } from './LoginPortal'

// 30 seconds
const POLL_INTERVAL = 30 * 1000
const LOGIN_INFO = gql`
  query LoginInfo($redirect: String) {
    loginInfo(redirect: $redirect) {
      oidcUri
      external
      oidcName
    }
  }
`

const setInputFocus = (ref: RefObject<any>) => {
  requestAnimationFrame(() => {
    ref.current?.querySelector('input')?.focus()
  })
}

function LoginError({
  me,
  error,
}: {
  me: Nullable<User>
  error: ApolloError | undefined
}) {
  useEffect(() => {
    if (!error?.networkError && !me) {
      const to = setTimeout(() => logoutWithReturnTo(), 2000)

      return () => clearTimeout(to)
    }
  }, [error?.networkError, me])

  console.error('Login error:', error)

  return (
    <LoginPortal>
      <LoopingLogo />
    </LoginPortal>
  )
}

export function EnsureLogin({ children }) {
  const { data, error, loading } = useMeQuery({
    pollInterval: POLL_INTERVAL,
    errorPolicy: 'ignore',
  })

  const loginContextValue = data

  if (error || (!loading && !data?.clusterInfo)) {
    return (
      <LoginError
        me={data?.me}
        error={error}
      />
    )
  }

  if (!data?.clusterInfo) return null

  return (
    <LoginContextProvider value={loginContextValue}>
      {children}
    </LoginContextProvider>
  )
}

function OIDCLogin({ oidcUri, external, oidcName }) {
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
          <Body1P
            $color="text-light"
            css={{ textAlign: 'center' }}
          >
            Connect to your Plural account for access to this Console.
          </Body1P>
        </Flex>
        <Button
          id="plrl-login"
          onClick={() => {
            window.location = oidcUri
          }}
        >
          Log in with {external ? oidcName || 'OIDC' : 'Plural'}
        </Button>
      </Flex>
    </LoginPortal>
  )
}

export function handleOauthChallenge(client, challenge) {
  client
    .mutate({
      mutation: AcceptLoginDocument,
      variables: { challenge },
    })
    .then(
      ({
        data: {
          acceptLogin: { redirectTo },
        },
      }) => {
        window.location = redirectTo
      }
    )
    .catch((err) => {
      console.error(err)
      wipeChallenge()
    })
}

export default function Login() {
  const theme = useTheme()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const emailRef = useRef<any>(undefined)
  const location = useLocation()
  const client = useApolloClient()
  const jwt = fetchToken()
  const { login_challenge: challenge } = queryString.parse(location.search)

  useEffect(() => {
    wipeChallenge()
    if (challenge) saveChallenge(challenge)
    setInputFocus(emailRef)
  }, [challenge])

  useEffect(() => {
    if (jwt && challenge) {
      handleOauthChallenge(client, challenge)
    }
  }, [jwt, challenge, client])

  const { data } = useQuery(ME_Q)
  const { data: loginData, loading } = useQuery(LOGIN_INFO, {
    variables: { redirect: localized('/oauth/callback') },
  })

  const [loginMutation, { loading: loginMLoading, error: loginMError }] =
    useMutation(SIGNIN, {
      variables: form,
      onCompleted: ({ signIn: { jwt, refreshToken } }) => {
        setToken(jwt)
        setRefreshToken(refreshToken?.token)
        navigate(getLoginReturnPath())
      },
      onError: console.error,
    })

  useEffect(() => {
    if (!loginMError && data?.me) navigate(getLoginReturnPath())
  }, [loginMError, data?.me, navigate])

  if (loading)
    return (
      <ShowAfterDelay>
        <LoadingIndicator />
      </ShowAfterDelay>
    )

  if (loginData?.loginInfo?.oidcUri) {
    return (
      <OIDCLogin
        oidcUri={loginData.loginInfo.oidcUri}
        external={loginData.loginInfo.external}
        oidcName={loginData.loginInfo.oidcName}
      />
    )
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
      <form onSubmit={onSubmit}>
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            marginBottom: 10,
            gap: theme.spacing.xsmall,
          }}
        >
          {loginMError && (
            <div css={{ marginBottom: theme.spacing.large }}>
              <GqlError
                header="Login failed"
                error={loginError}
              />
            </div>
          )}
          <Flex
            flexDirection="column"
            gap="small"
            marginBottom={theme.spacing.small}
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
            loading={loginMLoading}
            disabled={disabled}
          >
            Log in
          </Button>
        </div>
      </form>
    </LoginPortal>
  )
}
