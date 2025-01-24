import { ApolloError } from '@apollo/client'
import {
  ArrowTopRightIcon,
  Chip,
  ChipSeverity,
  Flex,
  IconFrame,
  Table,
  Tooltip,
} from '@pluralsh/design-system'
import { AlertFragment, AlertSeverity, AlertState } from 'generated/graphql'

import { createColumnHelper } from '@tanstack/react-table'
import { ColExpander } from 'components/cd/cluster/pod/PodContainers'
import dayjs from 'dayjs'
import { isEmpty, truncate, upperFirst } from 'lodash'
import { useTheme } from 'styled-components'
import { GqlError } from './Alert'
import { AlertsTableExpander } from './AlertsTableExpander'
import { StackedText } from './table/StackedText'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  VirtualSlice,
} from './table/useFetchPaginatedData'
import { StandardUrl } from './typography/Text'

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
      data={alerts}
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
      emptyStateProps={{ message: 'No alerts found.' }}
      css={{
        // hacky, for targeting the expander row. should build this into table
        'tr:has(td[colspan]) td': { background: theme.colors['fill-two'] },
      }}
    />
  )
}

const severityToChipSeverity: Record<AlertSeverity, ChipSeverity> = {
  [AlertSeverity.Critical]: 'critical',
  [AlertSeverity.High]: 'danger',
  [AlertSeverity.Medium]: 'warning',
  [AlertSeverity.Low]: 'success',
  [AlertSeverity.Undefined]: 'neutral',
}

const cols = [
  ColExpander,
  columnHelper.accessor((alert) => alert.title, {
    id: 'title',
    header: 'Title',
    meta: { gridTemplate: 'minmax(240px, 1fr)' },
    cell: function Cell({ getValue, row }) {
      return (
        <StackedText
          first={getValue()}
          second={dayjs(row.original.updatedAt).format('MM/DD/YYYY hh:mma')}
        />
      )
    },
  }),
  columnHelper.accessor((alert) => alert.message, {
    id: 'message',
    header: 'Message',
    meta: { gridTemplate: 'minmax(320px, 1fr)' },
    cell: function Cell({ getValue }) {
      return truncate(getValue() ?? '', { length: 120 })
    },
  }),
  columnHelper.accessor((alert) => alert.state, {
    id: 'state',
    header: 'State',
    cell: function Cell({ getValue }) {
      const state = getValue()
      return (
        <Chip
          css={{ width: 'max-content' }}
          size="small"
          severity={state === AlertState.Firing ? 'danger' : 'neutral'}
          inactive={state !== AlertState.Firing}
        >
          {state === AlertState.Firing ? 'Firing' : 'Non-firing'}
        </Chip>
      )
    },
  }),
  columnHelper.accessor((alert) => alert.severity, {
    id: 'severity',
    header: 'Severity',
    cell: function Cell({ getValue }) {
      return (
        <Chip
          size="small"
          severity={severityToChipSeverity[getValue()]}
        >
          {upperFirst(getValue().toLowerCase())}
        </Chip>
      )
    },
  }),
  columnHelper.accessor((alert) => alert.url, {
    id: 'url',
    header: 'URL',
    cell: function Cell({ getValue }) {
      return (
        <Tooltip
          placement="top"
          label={getValue()}
        >
          <div>
            <Flex
              gap="small"
              align="center"
              maxWidth="250px"
            >
              <StandardUrl href={getValue()}>
                {truncate(getValue() ?? '', { length: 25 })}
              </StandardUrl>
              <IconFrame
                clickable
                icon={<ArrowTopRightIcon />}
                onClick={() => window.open(getValue() || '', '_blank')}
              />
            </Flex>
          </div>
        </Tooltip>
      )
    },
  }),
]
