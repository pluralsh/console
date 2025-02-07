import { useOutletContext } from 'react-router-dom'

import EventsTable from '../utils/EventsTable'
import { ComponentDetailsContext } from './ComponentDetails'

export default function ComponentEvents() {
  const { componentDetails } = useOutletContext<ComponentDetailsContext>()

  const events = componentDetails?.events || []

  return (
    <EventsTable
      fullHeightWrap
      events={events}
      marginBottom="0"
      maxHeight="100%"
    />
  )
}
