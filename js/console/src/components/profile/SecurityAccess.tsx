import { Button, Code, Flex } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { localized } from 'helpers/hostname'

import { InlineA } from 'components/utils/typography/Text'
import { useTemporaryTokenLazyQuery } from 'generated/graphql'
import { useTheme } from 'styled-components'
import { ProfileCard } from './Profile'

export default function SecurityAccess() {
  const theme = useTheme()
  const [fetch, { error, data }] = useTemporaryTokenLazyQuery()
  const url = localized('/access')

  return (
    <ProfileCard>
      <Flex
        flexDirection="column"
        gap="large"
      >
        {error && (
          <GqlError
            error={error}
            header="Could not generate temporary token"
          />
        )}
        <div
          css={{
            ...theme.partials.text.body1,
            fontWeight: 600,
          }}
        >
          Grant access
        </div>
        <p css={{ color: theme.colors['text-light'] }}>
          1. Copy the code below and send it to whoever needs access.
        </p>
        {!data?.temporaryToken && (
          <Button
            secondary
            alignSelf="start"
            onClick={() => fetch()}
          >
            Generate temporary access token
          </Button>
        )}
        {data?.temporaryToken && (
          <Code showLineNumbers={false}>{data.temporaryToken}</Code>
        )}
        <p css={{ color: theme.colors['text-light'] }}>
          <span>2. Have the recipient enter the code into&nbsp;</span>
          <InlineA href={url}>{url}</InlineA>
          <span>.</span>
        </p>
      </Flex>
    </ProfileCard>
  )
}
