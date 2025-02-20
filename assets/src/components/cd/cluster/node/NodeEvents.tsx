import { Flex } from '@pluralsh/design-system'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useOutletContext } from 'react-router-dom'

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
