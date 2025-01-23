import { ApolloError } from '@apollo/client'
import { Table } from '@pluralsh/design-system'
import {
  AlertFragment,
  AlertSeverity,
  AlertState,
  ObservabilityWebhookType,
} from 'generated/graphql'

import { createColumnHelper } from '@tanstack/react-table'
import { isEmpty } from 'lodash'
import { GqlError } from './Alert'
import { AlertsTableExpander } from './AlertsTableExpander'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  VirtualSlice,
} from './table/useFetchPaginatedData'
import { ColExpander } from 'components/cd/cluster/pod/PodContainers'
import { useTheme } from 'styled-components'

const columnHelper = createColumnHelper<AlertFragment>()

export function AlertsTable({
  alerts,
  loading,
  error,
  hasNextPage,
  fetchNextPage,
  setVirtualSlice,
}: {
  alerts: AlertFragment[]
  loading: boolean
  error: Nullable<ApolloError>
  hasNextPage: boolean
  fetchNextPage: () => void
  setVirtualSlice: (slice: VirtualSlice) => void
}) {
  const theme = useTheme()
  return error ? (
    <GqlError error={error} />
  ) : (
    <Table
      fullHeightWrap
      virtualizeRows
      fillLevel={1}
      rowBg="base"
      data={mockAlerts}
      //   data={alerts}
      columns={cols}
      hasNextPage={hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      loading={loading && !isEmpty(alerts)}
      reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      getRowCanExpand={() => true}
      renderExpanded={AlertsTableExpander}
      onRowClick={(_, row) => row.getToggleExpandedHandler()()}
      emptyStateProps={{ message: 'No vulnerabilities found.' }}
      css={{
        // hacky, for targeting the expander row. should build this into table
        'tr:has(td[colspan]) td': { background: theme.colors['fill-two'] },
      }}
    />
  )
}

const cols = [
  ColExpander,
  columnHelper.accessor((alert) => alert.title, {
    id: 'title',
    header: 'Title',
  }),
  columnHelper.accessor((alert) => alert.message, {
    id: 'message',
    header: 'Message',
  }),
  columnHelper.accessor((alert) => alert.state, {
    id: 'state',
    header: 'State',
  }),
  columnHelper.accessor((alert) => alert.severity, {
    id: 'severity',
    header: 'Severity',
  }),
  columnHelper.accessor((alert) => alert.title, {
    id: 'url',
    header: 'URL',
  }),
]

const mockAlerts: AlertFragment[] = [
  {
    __typename: 'Alert',
    id: '1',
    provider: ObservabilityWebhookType.Grafana,
    severity: AlertSeverity.Critical,
    state: AlertState.Resolved,
    title: 'High CPU Usage',
    message: 'CPU usage is above 90%',
    fingerprint: 'abc123',
    url: 'http://prometheus.example.com/alert/1',
    annotations: {
      description: 'CPU usage has been high for more than 5 minutes',
    },
    tags: [
      {
        __typename: 'Tag',
        id: 'tag1',
        name: 'cluster',
        value: 'prod-1',
      },
      {
        __typename: 'Tag',
        id: 'tag2',
        name: 'service',
        value: 'web-app',
      },
    ],
  },
  {
    __typename: 'Alert',
    id: '2',
    provider: ObservabilityWebhookType.Grafana,
    severity: AlertSeverity.Medium,
    state: AlertState.Firing,
    title: 'Memory Usage Warning',
    message: 'Memory usage is above 80%',
    fingerprint: 'def456',
    url: 'http://prometheus.example.com/alert/2',
    annotations: {
      description: 'Memory usage has been elevated for more than 10 minutes',
    },
    tags: [
      {
        __typename: 'Tag',
        id: 'tag3',
        name: 'cluster',
        value: 'prod-2',
      },
    ],
  },
]
