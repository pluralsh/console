import React, { useEffect } from 'react'
import gql from 'graphql-tag'
import { Box } from 'grommet'
import { GqlError } from 'forge-core'
import { useMutation } from 'react-apollo'
import { useLocation } from 'react-router'
import qs from 'query-string'
import { setToken } from '../helpers/auth'
import { localized } from '../helpers/hostname'
import { LoopingLogo } from './utils/AnimatedLogo'

const CALLBACK = gql`
  mutation Callback($code: String!, $redirect: String) {
    oauthCallback(code: $code, redirect: $redirect) { jwt }
  }
`

export function OAuthCallback() {
  const location = useLocation()
  const {code} = qs.parse(location.search)
  const [mutation, {error, loading}] = useMutation(CALLBACK, {
    variables: {code, redirect: localized('/oauth/callback')},
    onCompleted: (result) => {
      setToken(result.oauthCallback.jwt)
      window.location.href = '/'
    }
  })

  useEffect(() => {
    mutation()
  }, [code])

  return (
    <Box fill align='center' justify='center'>
      {loading && <LoopingLogo />}
      {error && <GqlError error={error} header='Failed to log in' />}
    </Box>
  )
}