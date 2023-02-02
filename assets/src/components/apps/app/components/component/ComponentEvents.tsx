import { useOutletContext } from 'react-router-dom'
import { Event as EventT } from 'generated/graphql'

import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'

import EventsTable from '../../../../utils/EventsTable'

export default function ComponentEvents() {
  const outletContext = useOutletContext<object>() ?? {}
  const data = 'data' in outletContext ? outletContext.data ?? {} : {}

  // To avoid mapping between component types and fields of data returned by API
  // we are picking first available value from API object for now.
  const value = data
    ? Object.values(data).find(value => value !== undefined)
    : null
  const events: EventT[] = value?.events || []

  return (
    <FullHeightTableWrap>
      <EventsTable
        events={events}
        marginBottom="0"
        maxHeight="100%"
      />
    </FullHeightTableWrap>
  )
}
