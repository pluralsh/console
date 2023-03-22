import { useQuery } from '@apollo/client'
import { useParams } from 'react-router-dom'
import type { Event } from 'generated/graphql'
import { Flex } from 'honorable'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { POLL_INTERVAL } from '../constants'
import { NODE_EVENTS_Q } from '../queries'
import EventsTable from '../../utils/EventsTable'

export default function NodeEvents() {
  const { name } = useParams()
  const { data, refetch: _refetch } = useQuery<{
    node: {
      events?: Event[]
    }
  }>(NODE_EVENTS_Q, {
    variables: { name },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  if (!data) return <LoadingIndicator />

  const { node: { events } } = data

  return (
    <Flex
      direction="column"
      height="100%"
      overflow="hidden"
    >
      <EventsTable events={events} />
    </Flex>
  )
}
