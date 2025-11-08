import {
  Chip,
  DropdownArrowIcon,
  Flex,
  IconFrame,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2BoldP } from 'components/utils/typography/Text'
import { SentinelCheckType, SentinelRunStatus } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useTheme } from 'styled-components'
import {
  getSentinelCheckIcon,
  SentinelStatusChip,
} from '../../SentinelsTableCols'
import { SentinelCheckWithResult } from './SentinelRun'
import {
  getJobStatusCounts,
  JobStatusFilterKey,
  jobStatusToSeverity,
  SentinelRunChecksTableExpander,
} from './SentinelRunChecksTableExpander'

export function SentinelRunChecksTable({
  tableData,
  loading,
}: {
  tableData: SentinelCheckWithResult[]
  loading?: boolean
}) {
  return (
    <Flex
      direction="column"
      gap="xsmall"
      overflow="hidden"
    >
      <StackedText
        first={`Run checks (${tableData.length})`}
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
        data={tableData}
        columns={runChecksCols}
        loading={isEmpty(tableData) && loading}
        expandedRowType="custom"
        getRowCanExpand={() => true}
        renderExpanded={({ row }: { row: Row<SentinelCheckWithResult> }) => (
          <SentinelRunChecksTableExpander row={row} />
        )}
        onRowClick={(_, row) => row.getToggleExpandedHandler()()}
        emptyStateProps={{ message: 'No checks found for this run.' }}
      />
    </Flex>
  )
}

const columnHelper = createColumnHelper<SentinelCheckWithResult>()

const runChecksCols = [
  columnHelper.display({
    id: 'actions',
    meta: { gridTemplate: '24px' },
    cell: function Cell({ row }) {
      const isExpanded = row.getIsExpanded()
      return (
        <IconFrame
          icon={
            <DropdownArrowIcon
              style={{ rotate: isExpanded ? '0deg' : '-90deg' }}
            />
          }
          tooltip={isExpanded ? 'Collapse details' : 'View details'}
        />
      )
    },
  }),
  columnHelper.accessor(({ check }) => check, {
    id: 'name',
    meta: { gridTemplate: '1fr' },
    cell: function Cell({ getValue }) {
      const { spacing } = useTheme()
      const { name, type } = getValue()
      return (
        <Flex
          align="center"
          gap="xsmall"
          marginLeft={spacing.medium}
        >
          <IconFrame
            type="secondary"
            size="small"
            icon={getSentinelCheckIcon(type)}
          />
          <Body2BoldP $color="text">{name}</Body2BoldP>
        </Flex>
      )
    },
  }),
  columnHelper.accessor(({ check, result }) => ({ check, result }), {
    id: 'status',
    header: 'Status',
    cell: function Cell({ getValue }) {
      const { check, result } = getValue()
      if (check.type === SentinelCheckType.IntegrationTest) {
        return (
          <Flex gap="xxsmall">
            {Object.entries(getJobStatusCounts(result)).map(
              ([label, count]) => (
                <Chip
                  key={label}
                  size="small"
                  severity={jobStatusToSeverity(label as JobStatusFilterKey)}
                >
                  {count}
                </Chip>
              )
            )}
          </Flex>
        )
      }
      return (
        <div css={{ alignSelf: 'flex-end' }}>
          <SentinelStatusChip
            spinner
            showSeverity
            status={result?.status ?? SentinelRunStatus.Pending}
          />
        </div>
      )
    },
  }),
]
