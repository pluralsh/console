import { useLazyQuery } from '@apollo/client'
import { Code, ContentCard, Flex } from '@pluralsh/design-system'
import { TEMP_TOKEN_Q } from 'components/graphql/users'
import { GqlError } from 'components/utils/Alert'
import { localized } from 'helpers/hostname'
import { A, Button, P } from 'honorable'
import { useTheme } from 'styled-components'

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
        <P color="text-light">
          1. Copy the code below and send it to whoever needs access.
        </P>
        {!data?.temporaryToken && (
          <Button
            alignSelf="start"
            fontWeight={600}
            secondary
            onClick={() => fetch()}
          >
            Generate temporary access token
          </Button>
        )}
        {data?.temporaryToken && (
          <Code showLineNumbers={false}>{data.temporaryToken}</Code>
        )}
        <P color="text-light">
          <span>2. Have the recipient enter the code into&nbsp;</span>
          <A
            inline
            href={url}
            target="_blank"
          >
            {url}
          </A>
          <span>.</span>
        </P>
      </Flex>
    </ContentCard>
  )
}
