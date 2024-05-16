import { Box } from 'grommet'
import { Button, Code, ContentCard } from '@pluralsh/design-system'
import { localized } from 'helpers/hostname'
import { useLazyQuery } from '@apollo/client'
import { TEMP_TOKEN_Q } from 'components/graphql/users'
import { GqlError } from 'components/utils/Alert'
import { useTheme } from 'styled-components'

export default function SecurityAccess() {
  const theme = useTheme()
  const [fetch, { error, data }] = useLazyQuery(TEMP_TOKEN_Q)
  const url = localized('/access')

  return (
    <ContentCard overflowY="auto">
      <Box
        gap="medium"
        fill
      >
        {error && (
          <GqlError
            error={error}
            header="Could not generate temporary token"
          />
        )}
        <div css={{ ...theme.partials.text.body1, fontWeight: '600' }}>
          Grant access
        </div>
        <p css={{ color: 'text-light' }}>
          1. Copy the code below and send it to whoever needs access.
        </p>
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
        <p css={{ color: 'text-light' }}>
          <span>2. Have the recipient enter the code into </span>
          <a
            css={{ ...theme.partials.text.inlineLink }}
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            {url}
          </a>
          <span>.</span>
        </p>
      </Box>
    </ContentCard>
  )
}
