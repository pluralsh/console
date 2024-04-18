import { createColumnHelper } from '@tanstack/react-table'
import { useSetBreadcrumbs } from '@pluralsh/design-system'
import React, { useMemo } from 'react'

import {
  Common_EventList as EventListT,
  Common_Event as EventT,
  EventsQuery,
  EventsQueryVariables,
  Maybe,
  useEventsQuery,
} from '../../../generated/graphql-kubernetes'
import { ResourceList } from '../common/ResourceList'
import { DateTimeCol } from '../../utils/table/DateTimeCol'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import {
  EVENTS_REL_PATH,
  getClusterAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { Kind } from '../common/types'
import ResourceLink from '../common/ResourceLink'

import { EventTypeChip } from './utils'
import { getClusterBreadcrumbs } from './Cluster'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getClusterBreadcrumbs(cluster),
  {
    label: 'events',
    url: `${getClusterAbsPath(cluster?.id)}/${EVENTS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<EventT>()

const colObjectName = columnHelper.accessor((event) => event?.objectName, {
  id: 'objectName',
  header: 'Name',
  cell: ({ getValue }) => getValue(),
})

const colObjectNamespace = columnHelper.accessor(
  (event) => event?.objectNamespace,
  {
    id: 'objectNamespace',
    header: 'Namespace',
    cell: ({ getValue }) => {
      const namespace = getValue()

      return (
        <ResourceLink
          objectRef={{
            kind: Kind.Namespace,
            name: namespace,
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )
    },
  }
)

const colReason = columnHelper.accessor((event) => event.reason, {
  id: 'reason',
  header: 'Reason',
  cell: ({ getValue }) => getValue(),
})

const colType = columnHelper.accessor((event) => event.type, {
  id: 'type',
  header: 'Type',
  cell: ({ getValue }) => <EventTypeChip type={getValue()} />,
})

const colMessage = columnHelper.accessor((event) => event.message, {
  id: 'message',
  header: 'Message',
  cell: ({ getValue }) => getValue(),
})

const colSource = columnHelper.accessor((event) => event, {
  id: 'source',
  header: 'Source',
  cell: ({ getValue }) => {
    const event = getValue()

    return `${event.sourceComponent} ${event.sourceHost}`
  },
})

const colCount = columnHelper.accessor((event) => event.count, {
  id: 'count',
  header: 'Count',
  cell: ({ getValue }) => getValue(),
})

const colFirstSeen = columnHelper.accessor((event) => event.firstSeen, {
  id: 'firstSeen',
  header: 'First seen',
  cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
})

const colLastSeen = columnHelper.accessor((event) => event.lastSeen, {
  id: 'lastSeen',
  header: 'Last seen',
  cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
})

export function useEventsColumns(): Array<object> {
  return useMemo(
    () => [
      colObjectName,
      colObjectNamespace,
      colReason,
      colType,
      colMessage,
      colSource,
      colCount,
      colFirstSeen,
      colLastSeen,
    ],
    []
  )
}

export default function Events() {
  const cluster = useCluster()
  const columns = useEventsColumns()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  return (
    <ResourceList<EventListT, EventT, EventsQuery, EventsQueryVariables>
      namespaced
      columns={columns}
      query={useEventsQuery}
      queryName="handleGetEventList"
      itemsKey="events"
      disableOnRowClick
    />
  )
}
