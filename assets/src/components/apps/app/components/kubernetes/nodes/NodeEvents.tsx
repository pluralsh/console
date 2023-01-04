import { useContext, useEffect } from 'react'
import { useQuery } from 'react-apollo'
import { useParams } from 'react-router-dom'

import type { Event } from 'generated/graphql'
import { LoopingLogo } from 'components/utils/AnimatedLogo'
import { BreadcrumbsContext } from 'components/Breadcrumbs'

import { ScrollablePage } from 'components/layout/ScrollablePage'

import { POLL_INTERVAL } from '../constants'
import { NODE_EVENTS_Q } from '../queries'

import EventsTable from '../../EventsTable'

export default function NodeEvents() {
  const { name } = useParams()
  const { data, refetch: _refetch } = useQuery<{
    node: {
      events?: Event[]
    }
  }>(NODE_EVENTS_Q, {
    variables: { name },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })
  const { setBreadcrumbs } = useContext(BreadcrumbsContext)

  useEffect(() => {
    setBreadcrumbs([
      { text: 'nodes', url: '/nodes' },
      { text: name || '', url: `/nodes/${name}` },
    ])
  }, [name, setBreadcrumbs])

  if (!data) return <LoopingLogo dark />

  const { node: { events } } = data

  return (
    <ScrollablePage heading="Events">
      <EventsTable events={events} />
    </ScrollablePage>
  )
}
