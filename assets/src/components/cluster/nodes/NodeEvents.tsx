import { useQuery } from 'react-apollo'
import { useParams } from 'react-router-dom'

import type { Event } from 'generated/graphql'
import { LoopingLogo } from 'components/utils/AnimatedLogo'

import { ScrollablePage } from 'components/layout/ScrollablePage'

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

  if (!data) return <LoopingLogo />

  const { node: { events } } = data

  return (
    <ScrollablePage heading="Events">
      <EventsTable events={events} />
    </ScrollablePage>
  )
}
