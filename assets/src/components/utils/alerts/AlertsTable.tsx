import { ApolloError } from '@apollo/client'
import {
  Button,
  Chip,
  ChipSeverity,
  ErrorIcon,
  EyeIcon,
  Flex,
  IconFrame,
  Table,
  Tooltip,
} from '@pluralsh/design-system'
import { AlertFragment, AlertSeverity, AlertState } from 'generated/graphql'

import { createColumnHelper } from '@tanstack/react-table'
import { ColExpander } from 'components/cd/cluster/pod/PodContainers'
import { isEmpty, truncate, upperFirst } from 'lodash'
import { useTheme } from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import { AiInsightSummaryIcon } from '../AiInsights'
import { GqlError } from '../Alert'

import { StackedText } from '../table/StackedText'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  VirtualSlice,
} from '../table/useFetchPaginatedData'
import { InlineA } from '../typography/Text'
import { AlertsTableExpander } from './AlertsTableExpander'
import { useState } from 'react'
import { AlertResolutionModal } from './AlertResolutionModal'

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
      loading={loading && isEmpty(alerts)}
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
    meta: { gridTemplate: 'minmax(220px, 1fr)', truncate: true },
    cell: function Cell({ getValue, row }) {
      return (
        <StackedText
          first={getValue()}
          second={formatDateTime(row.original.updatedAt, 'M/D/YYYY h:mma')}
        />
      )
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
          <Flex
            gap="xsmall"
            align="center"
          >
            {state === AlertState.Firing && <ErrorIcon size={12} />}
            {state === AlertState.Firing ? 'Firing' : 'Non-firing'}
          </Flex>
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
  columnHelper.accessor((alert) => alert, {
    id: 'url',
    header: 'URL',
    cell: function Cell({ getValue }) {
      const { url, insight } = getValue()
      return (
        <Flex
          gap="small"
          align="center"
          maxWidth="250px"
        >
          <Tooltip
            placement="top"
            label={url}
          >
            <InlineA href={url}>{truncate(url ?? '', { length: 25 })}</InlineA>
          </Tooltip>
          <AiInsightSummaryIcon
            insight={insight}
            navPath={`insight/${insight?.id}`}
          />
        </Flex>
      )
    },
  }),
  columnHelper.accessor((alert) => alert, {
    id: 'resolution',
    header: '',
    cell: function Cell({ getValue }) {
      const { id, resolution } = getValue()
      const [isOpen, setIsOpen] = useState(false)
      const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsOpen(!isOpen)
      }
      return (
        <>
          {resolution ? (
            <Flex gap="xsmall">
              <Button
                small
                floating
                disabled
              >
                Resolved
              </Button>
              <IconFrame
                clickable
                onClick={handleClick}
                type="floating"
                tooltip="View resolution"
                icon={<EyeIcon />}
              />
            </Flex>
          ) : (
            <Button
              small
              floating
              onClick={handleClick}
            >
              Resolve
            </Button>
          )}
          <AlertResolutionModal
            open={isOpen}
            onClose={() => setIsOpen(false)}
            initialResolution={resolution}
            alertId={id}
          />
        </>
      )
    },
  }),
]
