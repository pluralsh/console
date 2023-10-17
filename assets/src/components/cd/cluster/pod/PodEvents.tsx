import { useOutletContext } from 'react-router-dom'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { Pod } from 'generated/graphql'

import EventsTable from '../../../utils/EventsTable'

export default function PodEvents() {
  const { pod } = useOutletContext() as { pod: Pod }

  if (!pod) return <LoadingIndicator />

  return (
    <ScrollablePage heading="Events">
      <EventsTable events={pod.events || []} />
    </ScrollablePage>
  )
}
