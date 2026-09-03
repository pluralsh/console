import { Flex, LoopingLogo } from '@pluralsh/design-system'
import { useEffect } from 'react'
import { useParams } from 'react-router'
import { useNavigate } from 'react-router-dom'

import { useTheme } from 'styled-components'

import { setRefreshToken, setToken } from '../../helpers/auth'

import { useLoginLinkMutation } from 'generated/graphql'
import { LoginPortal } from './LoginPortal'

export function LinkLogin() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { key = '' } = useParams()
  const [mutation, { error }] = useLoginLinkMutation({
    variables: { key },
    onCompleted: ({ loginLink }) => {
      const { jwt, refreshToken } = loginLink ?? {}
      setToken(jwt)
      setRefreshToken(refreshToken?.token)
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
      <Flex
        alignItems="center"
        justifyContent="center"
      >
        <Flex>
          <h3 css={theme.partials.text.title2}>This login link is invalid</h3>
        </Flex>
      </Flex>
    )
  }

  return (
    <LoginPortal>
      <LoopingLogo />
    </LoginPortal>
  )
}
