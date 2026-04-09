import {
  ArrowTopRightIcon,
  Chip,
  Flex,
  Table,
  Tooltip,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { IssueStatusChip } from 'components/workbenches/common/IssueStatusChip'
import { StackedText } from 'components/utils/table/StackedText'
import { VirtualSlice } from 'components/utils/table/useFetchPaginatedData'
import { InlineA } from 'components/utils/typography/Text'
import { WorkbenchIssueFragment } from 'generated/graphql'
import { truncate } from 'lodash'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDateTime } from 'utils/datetime'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'

const columnHelper = createColumnHelper<WorkbenchIssueFragment>()

function getColumns(fallbackWorkbenchId?: string) {
  return [
    columnHelper.accessor((issue) => issue, {
      id: 'title',
      header: 'Issue',
      meta: { gridTemplate: 'minmax(220px, 2fr)', truncate: true },
      cell: function Cell({ getValue }) {
        const issue = getValue()

        return (
          <StackedText
            first={issue.title}
            second={
              issue.insertedAt
                ? formatDateTime(issue.insertedAt, 'M/D/YYYY h:mma')
                : ''
            }
            firstPartialType="body2LooseLineHeight"
            firstColor="text-light"
            secondPartialType="caption"
            secondColor="text-xlight"
            truncate
          />
        )
      },
    }),
    columnHelper.accessor((issue) => issue.url, {
      id: 'url',
      header: '',
      meta: { gridTemplate: 'minmax(220px, 2fr)' },
      cell: function Cell({ getValue }) {
        const url = getValue()

        return (
          <Tooltip
            placement="top"
            label={url}
          >
            <Flex gap="small">
              <InlineA href={url}>
                <Flex
                  gap="xsmall"
                  align="center"
                >
                  {truncate(url, { length: 42 })}
                </Flex>
              </InlineA>
              <ArrowTopRightIcon />
            </Flex>
          </Tooltip>
        )
      },
    }),
    columnHelper.accessor((issue) => issue.status, {
      id: 'ticketStatus',
      header: 'Ticket status',
      meta: { gridTemplate: 'minmax(100px, 1fr)' },
      cell: function Cell({ getValue }) {
        return <IssueStatusChip status={getValue()} />
      },
    }),
    columnHelper.accessor((issue) => issue, {
      id: 'viewJob',
      header: '',
      meta: { gridTemplate: 'auto' },
      cell: function Cell({ getValue }) {
        const navigate = useNavigate()
        const issue = getValue()
        const workbenchId = issue.workbench?.id ?? fallbackWorkbenchId
        const workbenchJobId = issue.workbenchJob?.id

        if (!workbenchId || !workbenchJobId) return null

        return (
          <Chip
            clickable
            onClick={() =>
              navigate(
                getWorkbenchJobAbsPath({ workbenchId, jobId: workbenchJobId })
              )
            }
            size="large"
          >
            View job
          </Chip>
        )
      },
    }),
  ]
}

export function WorkbenchIssuesTable({
  issues,
  loading,
  hasNextPage,
  fetchNextPage,
  setVirtualSlice,
  fallbackWorkbenchId,
}: {
  issues: WorkbenchIssueFragment[]
  loading: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  setVirtualSlice: (slice: VirtualSlice) => void
  fallbackWorkbenchId?: string
}) {
  const columns = useMemo(
    () => getColumns(fallbackWorkbenchId),
    [fallbackWorkbenchId]
  )

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      data={issues}
      columns={columns}
      hasNextPage={hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      loading={loading && issues.length === 0}
      emptyStateProps={{ message: 'No issues found.' }}
    />
  )
}
