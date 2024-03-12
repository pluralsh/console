import { useEffect, useRef } from 'react'
import gql from 'graphql-tag'
import { Box } from 'grommet'
import { Alert, AlertStatus } from 'forge-core'
import { useLocation } from 'react-router'
import qs from 'query-string'
import { useMutation } from '@apollo/client'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { RefreshTokenFragment } from 'components/graphql/users'

import { useNavigate } from 'react-router-dom'

import { Button } from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import { setRefreshToken, setToken } from '../../helpers/auth'
import { localized } from '../../helpers/hostname'

import { LoginPortal } from './LoginPortal'

const CALLBACK = gql`
  mutation Callback($code: String!, $redirect: String) {
    oauthCallback(code: $code, redirect: $redirect) {
      jwt
      refreshToken {
        ...RefreshTokenFragment
      }
    }
  }
  ${RefreshTokenFragment}
`

function OAuthError({ error: { error, error_description: description } }: any) {
  return (
    <LoginPortal>
      <Box gap="medium">
        <Box
          gap="xsmall"
          align="center"
        >
          <Alert
            status={AlertStatus.ERROR}
            header={error}
            description={
              description ||
              'You cannot log into this console instance, make sure your Plural user was added to its OIDC provider'
            }
          />
        </Box>
      </Box>
    </LoginPortal>
  )
}

export function OAuthCallback() {
  const location = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const { code, ...oauthError } = qs.parse(location.search)
  const prevCode = useRef<any>()
  const [mutation, { error, loading }] = useMutation(CALLBACK, {
    variables: { code, redirect: localized('/oauth/callback') },
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
      height="100vh"
      width="100vw"
      align="center"
      justify="center"
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
