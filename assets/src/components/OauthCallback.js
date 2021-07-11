import React, { useEffect } from 'react'
import gql from 'graphql-tag'
import { Loading } from './utils/Loading'
import { Box } from 'grommet'
import { GqlError } from 'forge-core'
import { useMutation } from 'react-apollo'
import { useHistory, useLocation } from 'react-router'
import qs from 'query-string'
import { setToken } from '../helpers/auth'

const CALLBACK = gql`
  mutation Callback($code: String!) {
    oauthCallback(code: $code) { jwt }
  }
`

export function OAuthCallback() {
  const location = useLocation()
  let history = useHistory()
  const {code} = qs.parse(location.search)
  const [mutation, {error, loading}] = useMutation(CALLBACK, {
    variables: {code},
    onCompleted: ({oauthCallback: {jwt}}) => {
      setToken(jwt)
      history.push('/')
    }
  })

  useEffect(() => {
    mutation()
  }, [code])

  return (
    <Box fill align='center' justify='center'>
      {loading && <Loading />}
      {error && <GqlError error={error} header='Failed to log in' />}
    </Box>
  )
}