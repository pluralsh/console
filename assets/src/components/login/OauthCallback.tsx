import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import qs from 'query-string'
import { useNavigate } from 'react-router-dom'
import { Button, Callout } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { setRefreshToken, setToken } from '../../helpers/auth'
import { localized } from '../../helpers/hostname'

import { LoginPortal } from './LoginPortal'
import {
  OauthCallbackMutationVariables,
  useOauthCallbackMutation,
} from 'generated/graphql'

function OAuthError({ error: { error, error_description: description } }: any) {
  return (
    <LoginPortal>
      <Callout
        severity="danger"
        title={error}
      >
        {description ||
          'You cannot log into this console instance, make sure your Plural user was added to its OIDC provider'}{' '}
      </Callout>
    </LoginPortal>
  )
}

export function OAuthCallback() {
  const location = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const { code, state, ...oauthError } = qs.parse(location.search)
  const prevCode = useRef<any>(undefined)
  const [mutation, { error, loading }] = useOauthCallbackMutation({
    variables: {
      code,
      state,
      redirect: localized('/oauth/callback'),
    } as OauthCallbackMutationVariables,
    onCompleted: (result) => {
      const { jwt, refreshToken } = result?.oauthCallback || {}

      setToken(jwt)
      setRefreshToken(refreshToken?.token)
      navigate('/')
    },
  })

  useEffect(() => {
    if (code !== prevCode.current) {
      mutation()
      prevCode.current = code
    }
  }, [code, mutation])

  if (!code) return <OAuthError error={oauthError} />

  if (loading) return <LoadingIndicator />

  return error ? (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.medium,
      }}
    >
      <GqlError
        error={error}
        header="Failed to log in"
      />
      {error && (
        <Button
          onClick={() => {
            navigate('/login')
          }}
        >
          Go to login page
        </Button>
      )}
    </div>
  ) : null
}
