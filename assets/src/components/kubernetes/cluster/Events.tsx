import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import {
  Common_EventList as EventListT,
  Common_Event as EventT,
  EventsQuery,
  EventsQueryVariables,
  useEventsQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'

const columnHelper = createColumnHelper<EventT>()

export default function Events() {
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<EventListT, EventT, EventsQuery, EventsQueryVariables>
      namespaced
      columns={columns}
      query={useEventsQuery}
      queryName="handleGetEventList"
      itemsKey="events"
    />
  )
}
