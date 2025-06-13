import { useLazyQuery } from '@apollo/client'
import { Button, Code, ContentCard, Flex } from '@pluralsh/design-system'
import { TEMP_TOKEN_Q } from 'components/graphql/users'
import { GqlError } from 'components/utils/Alert'
import { localized } from 'helpers/hostname'

import { useTheme } from 'styled-components'
import { InlineA } from 'components/utils/typography/Text'

export default function SecurityAccess() {
  const theme = useTheme()
  const [fetch, { error, data }] = useLazyQuery(TEMP_TOKEN_Q)
  const url = localized('/access')

  return (
    <ContentCard overflowY="auto">
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
    </ContentCard>
  )
}
