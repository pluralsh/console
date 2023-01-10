import { Box } from 'grommet'
import {
  A,
  Button,
  Div,
  P,
  Span,
} from 'honorable'
import { Codeline, ContentCard } from '@pluralsh/design-system'
import { localized } from 'helpers/hostname'
import { fetchToken } from 'helpers/auth'
import { useState } from 'react'

export default function SecurityAccess() {
  const [token, setToken] = useState<boolean>(false)
  const jwt = fetchToken()
  const url = localized('/access')

  return (
    <ContentCard overflowY="auto">
      <Box
        gap="medium"
        fill
      >
        <Div
          body1
          fontWeight="600"
        >
          Grant access
        </Div>
        <P color="text-light">1. Copy the code below and send it to whoever needs access.</P>
        {!token && (
          <Button
            alignSelf="start"
            fontWeight={600}
            secondary
            onClick={() => setToken(true)}
          >
            Generate temporary access token
          </Button>
        )}
        {token && <Codeline>{jwt}</Codeline>}
        <P color="text-light">
          <Span>2. Have the recipent enter the code into&nbsp;</Span>
          <A
            inline
            href={url}
            target="_blank"
          >
            {url}
          </A>
          <Span>.</Span>
        </P>
      </Box>
    </ContentCard>
  )
}
