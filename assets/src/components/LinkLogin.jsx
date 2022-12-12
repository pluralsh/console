import { Box, Text } from 'grommet'
import { useEffect } from 'react'
import { useMutation } from 'react-apollo'
import { useParams } from 'react-router'

import { setToken } from '../helpers/auth'

import { LOGIN_LINK } from './graphql/users'
import { LoginPortal } from './Login'
import { LoopingLogo } from './utils/AnimatedLogo'

export function LinkLogin() {
  const { key } = useParams()
  const [mutation, { error }] = useMutation(LOGIN_LINK, {
    variables: { key },
    onCompleted: ({ loginLink: { jwt } }) => {
      setToken(jwt)
      window.location = '/'
    },
    onError: console.log,
  })

  useEffect(() => {
    mutation()
  }, [])

  if (error) {
    return (
      <Box
        fill
        align="center"
        justify="center"
      >
        <Box>
          <Text>This login link is invalid</Text>
        </Box>
      </Box>
    )
  }

  return (
    <LoginPortal>
      <LoopingLogo />
    </LoginPortal>
  )
}
