import { CaretRightIcon, Flex, IconFrame, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2P } from 'components/utils/typography/Text'
import {
  SentinelFragment,
  SentinelRunFragment,
  SentinelRunResultFragment,
} from 'generated/graphql'
import { useMemo } from 'react'
import { isNonNullable } from 'utils/isNonNullable'
import { SentinelStatusChip } from '../../SentinelsTableCols'
import { SentinelRunChecksTableExpander } from './SentinelRunChecksTableExpander'

export function SentinelRunChecksTable({
  run,
  parentSentinel,
  loading,
}: {
  run: Nullable<SentinelRunFragment>
  parentSentinel: Nullable<SentinelFragment>
  loading?: boolean
}) {
  const results = useMemo(
    () => run?.results?.filter(isNonNullable) ?? [],
    [run?.results]
  )
  return (
    <Flex
      direction="column"
      gap="xsmall"
      overflow="hidden"
    >
      <StackedText
        first="Run checks"
        firstPartialType="body2Bold"
        firstColor="text"
        second="Results of individual checks on this run"
        secondPartialType="body2"
        secondColor="text-xlight"
      />
      <Table
        hideHeader
        fullHeightWrap
        fillLevel={1}
        rowBg="base"
        data={results}
        columns={runChecksCols}
        loading={!run && !parentSentinel && loading}
        reactTableOptions={{ meta: { parentSentinel } }}
        expandedRowType="custom"
        getRowCanExpand={() => true}
        renderExpanded={({ row }) => (
          <SentinelRunChecksTableExpander
            row={row}
            parentSentinel={parentSentinel}
          />
        )}
        onRowClick={(_, row) => row.getToggleExpandedHandler()()}
        emptyStateProps={{ message: 'No checks found for this run.' }}
      />
    </Flex>
  )
}

const columnHelper = createColumnHelper<SentinelRunResultFragment>()

const runChecksCols = [
  columnHelper.display({
    id: 'actions',
    cell: function Cell({ row }) {
      const isExpanded = row.getIsExpanded()
      return (
        <IconFrame
          clickable
          icon={
            <CaretRightIcon style={{ rotate: isExpanded ? '90deg' : '0deg' }} />
          }
          tooltip={isExpanded ? 'View details' : 'Collapse details'}
        />
      )
    },
  }),
  columnHelper.accessor((result) => result.name, {
    id: 'name',
    meta: { gridTemplate: '1fr' },
    cell: function Cell({ getValue }) {
      return <Body2P $color="text">{getValue()}</Body2P>
    },
  }),
  columnHelper.accessor((result) => result.status, {
    id: 'status',
    header: 'Status',
    cell: function Cell({ getValue }) {
      return (
        <SentinelStatusChip
          showSeverity
          status={getValue()}
        />
      )
    },
  }),
]
