import { useOutletContext } from 'react-router-dom'
import { Flex } from 'honorable'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { Node } from 'generated/graphql'

import EventsTable from '../../../utils/EventsTable'

export default function NodeEvents() {
  const { node } = useOutletContext() as { node: Node }

  if (!node) return <LoadingIndicator />

  const { events } = node

  return (
    <Flex
      direction="column"
      height="100%"
      overflow="hidden"
    >
      <EventsTable events={events || []} />
    </Flex>
  )
}
