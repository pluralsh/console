import { Box, Text } from 'grommet'
import { useEffect } from 'react'
import { useMutation } from '@apollo/client'
import { useParams } from 'react-router'
import { LoopingLogo } from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'

import { setRefreshToken, setToken } from '../../helpers/auth'
import { LOGIN_LINK } from '../graphql/users'

import { LoginPortal } from './LoginPortal'

export function LinkLogin() {
  const navigate = useNavigate()
  const { key } = useParams()
  const [mutation, { error }] = useMutation(LOGIN_LINK, {
    variables: { key },
    onCompleted: ({ loginLink: { jwt, refreshToken } }) => {
      setToken(jwt)
      setRefreshToken(refreshToken)
      navigate('/')
    },
    onError: console.error,
  })

  useEffect(() => {
    mutation()
    // Only run on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
