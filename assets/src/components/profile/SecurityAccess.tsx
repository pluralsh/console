import { Box } from 'grommet'
import { A, Button, Div, P } from 'honorable'
import { Code, ContentCard } from '@pluralsh/design-system'
import { localized } from 'helpers/hostname'
import { useLazyQuery } from '@apollo/client'
import { TEMP_TOKEN_Q } from 'components/graphql/users'
import { GqlError } from 'components/utils/Alert'

export default function SecurityAccess() {
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
        <Div
          body1
          fontWeight="600"
        >
          Grant access
        </Div>
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
          <span>2. Have the recipent enter the code into&nbsp;</span>
          <A
            inline
            href={url}
            target="_blank"
          >
            {url}
          </A>
          <span>.</span>
        </P>
      </Box>
    </ContentCard>
  )
}
