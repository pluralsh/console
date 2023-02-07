import { useEffect } from 'react'
import gql from 'graphql-tag'
import { Box } from 'grommet'
import { Alert, AlertStatus, GqlError } from 'forge-core'
import { useLocation } from 'react-router'
import qs from 'query-string'
import { useMutation } from '@apollo/client'
import { LoopingLogo } from '@pluralsh/design-system'

import { setToken } from '../../helpers/auth'
import { localized } from '../../helpers/hostname'

import { LoginPortal } from './LoginPortal'

const CALLBACK = gql`
  mutation Callback($code: String!, $redirect: String) {
    oauthCallback(code: $code, redirect: $redirect) { jwt }
  }
`

function OAuthError({ error: { error, error_description: description } }) {
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
            description={description || 'You cannot log into this console instance, make sure your Plural user was added to its OIDC provider'}
          />
        </Box>
      </Box>
    </LoginPortal>
  )
}

export function OAuthCallback() {
  const location = useLocation()
  const { code, ...oauthError } = qs.parse(location.search)
  const [mutation, { error, loading }] = useMutation(CALLBACK, {
    variables: { code, redirect: localized('/oauth/callback') },
    onCompleted: result => {
      console.log(result)
      setToken(result.oauthCallback.jwt)
      window.location.href = '/'
    },
  })

  useEffect(() => {
    if (code) mutation()
  }, [code])

  if (!code) return <OAuthError error={oauthError} />

  return (
    <Box
      height="100vh"
      width="100vw"
      align="center"
      justify="center"
    >
      {loading && <LoopingLogo />}
      {error && (
        <GqlError
          error={error}
          header="Failed to log in"
        />
      )}
    </Box>
  )
}
