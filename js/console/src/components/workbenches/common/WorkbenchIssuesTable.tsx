import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { IssueLink } from 'components/workbenches/common/IssueLink'
import { IssueStatusChip } from 'components/workbenches/common/IssueStatusChip'
import { WorkbenchViewJobChip } from 'components/workbenches/common/WorkbenchViewJobChip'
import { StackedText } from 'components/utils/table/StackedText'
import { VirtualSlice } from 'components/utils/table/useFetchPaginatedData'
import { WorkbenchIssueFragment } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo } from 'react'
import { formatDateTime } from 'utils/datetime'

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
    columnHelper.accessor((issue) => issue, {
      id: 'url',
      header: '',
      meta: { gridTemplate: 'minmax(148px, 1.2fr)' },
      cell: function Cell({ getValue }) {
        const issue = getValue()

        return (
          <IssueLink
            url={issue.url}
            provider={issue.provider}
          />
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
        const issue = getValue()
        const workbenchId = issue.workbench?.id ?? fallbackWorkbenchId
        const workbenchJobId = issue.workbenchJob?.id

        if (!workbenchId || !workbenchJobId) return null

        return (
          <WorkbenchViewJobChip
            workbenchId={workbenchId}
            jobId={workbenchJobId}
            status={issue.workbenchJob?.status}
          />
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
      hideHeader
      fullHeightWrap
      virtualizeRows
      data={issues}
      columns={columns}
      hasNextPage={hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      loading={loading && isEmpty(issues)}
      emptyStateProps={{ message: 'No issues found.' }}
    />
  )
}
