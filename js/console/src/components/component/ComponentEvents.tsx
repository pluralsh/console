import { useOutletContext } from 'react-router-dom'

import { EventsTable } from '../utils/EventsTable'
import { ComponentDetailsContext } from './ComponentDetails'

export function ComponentEvents() {
  const { componentDetails, loading } =
    useOutletContext<ComponentDetailsContext>()

  const events = componentDetails?.events ?? []

  return (
    <EventsTable
      fullHeightWrap
      events={events}
      marginBottom="0"
      maxHeight="100%"
      loading={loading}
    />
  )
}
