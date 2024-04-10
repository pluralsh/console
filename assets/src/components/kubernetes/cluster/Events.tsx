import { createColumnHelper } from '@tanstack/react-table'
import { Link } from 'react-router-dom'
import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'

import {
  Common_EventList as EventListT,
  Common_Event as EventT,
  EventsQuery,
  EventsQueryVariables,
  Maybe,
  useEventsQuery,
} from '../../../generated/graphql-kubernetes'
import { ResourceList } from '../ResourceList'
import { DateTimeCol } from '../../utils/table/DateTimeCol'
import { ClusterTinyFragment } from '../../../generated/graphql'
import { InlineLink } from '../../utils/typography/InlineLink'
import {
  EVENTS_REL_PATH,
  getClusterAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useKubernetesContext } from '../Kubernetes'
import { getBaseBreadcrumbs } from '../utils'

import { EventTypeChip } from './utils'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'cluster',
    url: getClusterAbsPath(cluster?.id),
  },
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
    cell: ({ getValue, table }) => {
      const namespace = getValue()

      if (!namespace) return null

      const { cluster } = table.options.meta as {
        cluster?: ClusterTinyFragment
      }

      return (
        <Link
          to={getResourceDetailsAbsPath(cluster?.id, 'namespace', namespace)}
          onClick={(e) => e.stopPropagation()}
        >
          <InlineLink>{getValue()}</InlineLink>
        </Link>
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
  const { cluster } = useKubernetesContext()
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
