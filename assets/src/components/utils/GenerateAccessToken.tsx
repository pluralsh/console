import { ApolloError } from '@apollo/client'
import {
  Button,
  CheckIcon,
  CopyIcon,
  Flex,
  Input,
  WrapWithIf,
} from '@pluralsh/design-system'

import { useCreateAccessTokenMutation } from 'generated/graphql'
import CopyToClipboard from 'react-copy-to-clipboard'

import { useState } from 'react'

export function GenerateAccessToken({
  setError,
}: {
  setError: (error?: ApolloError) => void
}) {
  const [token, setToken] = useState('')
  const [copied, setCopied] = useState(false)
  const [mutation, { loading }] = useCreateAccessTokenMutation({
    onError: (e) => setError(e),
    onCompleted: (data) => {
      const token = data.createAccessToken?.token ?? ''

      setToken(token)
      setError(undefined)
      navigator.clipboard
        .writeText(token)
        .then(() => showCopied())
        .catch((e) => console.error("Couldn't copy URL to clipboard", e))
    },
  })
  const showCopied = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <Flex gap="medium">
      <Input
        css={{ flex: 1, caretColor: 'transparent' }}
        placeholder="Access token"
        value={token}
      />
      {token ? (
        <WrapWithIf
          condition={!copied}
          wrapper={
            <CopyToClipboard
              text={token}
              onCopy={showCopied}
            />
          }
        >
          <Button
            secondary
            startIcon={copied ? <CheckIcon /> : <CopyIcon />}
          >
            {copied ? 'Copied!' : 'Copy token'}
          </Button>
        </WrapWithIf>
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
