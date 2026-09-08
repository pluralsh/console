import {
  Button,
  CheckIcon,
  CopyIcon,
  Flex,
  Input,
  useCopyText,
} from '@pluralsh/design-system'

import { useCreateAccessTokenMutation } from 'generated/graphql'
import { useEffect, useState } from 'react'
import { GqlErrorType } from './Alert'

export function GenerateAccessToken({
  setError,
}: {
  setError: (error?: GqlErrorType) => void
}) {
  const [token, setToken] = useState('')
  const { copied, handleCopy } = useCopyText(token, 3000)
  const [mutation, { loading }] = useCreateAccessTokenMutation({
    onError: (e) => setError(e),
    onCompleted: (data) => {
      setToken(data.createAccessToken?.token ?? '')
      setError(undefined)
    },
  })

  useEffect(() => {
    if (token) handleCopy()
  }, [token, handleCopy])

  return (
    <Flex gap="medium">
      <Input
        css={{ flex: 1, caretColor: 'transparent' }}
        placeholder="Access token"
        value={token}
      />
      {token ? (
        <Button
          floating
          startIcon={copied ? <CheckIcon /> : <CopyIcon />}
          onClick={handleCopy}
        >
          {copied ? 'Copied!' : 'Copy token'}
        </Button>
      ) : (
        <Button
          loading={loading}
          onClick={() => mutation()}
        >
          Generate & copy
        </Button>
      )}
    </Flex>
  )
}
