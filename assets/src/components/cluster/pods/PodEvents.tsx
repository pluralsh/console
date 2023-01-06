import { useQuery } from 'react-apollo'
import { useParams } from 'react-router-dom'

import type { Event, Pod } from 'generated/graphql'
import { LoopingLogo } from 'components/utils/AnimatedLogo'

import { ScrollablePage } from 'components/layout/ScrollablePage'

import { NODE_EVENTS_Q, POD_EVENTS_Q } from '../queries'

import EventsTable from '../../utils/EventsTable'

export default function NodeEvents() {
  const { name, namespace } = useParams()
  const { data, error } = useQuery<{ pod: { events: Event } }>(POD_EVENTS_Q, {
    variables: { name, namespace },
    fetchPolicy: 'cache-and-network',
  })

  if (!data) return <LoopingLogo dark />

  const {
    pod: { events },
  } = data

  return (
    <ScrollablePage heading="Events">
      <EventsTable events={events || []} />
    </ScrollablePage>
  )
}
