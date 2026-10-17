import { useOutletContext } from 'react-router-dom'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Pod } from 'generated/graphql'

import { EventsTable } from '../../../utils/EventsTable'

// It's used by multiple routes.
export function PodEvents() {
  const { pod } = useOutletContext() as { pod: Pod }

  return (
    <ScrollablePage contentStyles={{ paddingTop: 0 }}>
      <EventsTable events={pod.events || []} />
    </ScrollablePage>
  )
}
