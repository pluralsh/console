import { useQuery } from '@apollo/client'
import { useParams } from 'react-router-dom'
import { stringify } from 'yaml'
import { Flex } from 'honorable'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { POLL_INTERVAL } from '../constants'
import { NODE_RAW_Q } from '../queries'
import { RawPageCode } from '../RawPageCode'

export default function NodeEvents() {
  const { name } = useParams()
  const { data, refetch: _refetch } = useQuery<{
    node: {
      raw: string
    }
  }>(NODE_RAW_Q, {
    variables: { name },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  if (!data) return <LoadingIndicator />

  const {
    node: { raw },
  } = data

  const content = stringify(JSON.parse(raw))

  return (
    <Flex
      direction="column"
      height="100%"
      overflow="hidden"
    >
      <RawPageCode>{content}</RawPageCode>
    </Flex>
  )
}
