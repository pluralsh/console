import { Chip, ChipSeverity, Table, Tooltip } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { WorkbenchTabHeader } from 'components/workbenches/common/WorkbenchTabHeader'
import { WorkbenchTabWrapper } from 'components/workbenches/common/WorkbenchTabWrapper'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { InlineA } from 'components/utils/typography/Text'
import {
  IssueStatus,
  IssueWebhookProvider,
  useWorkbenchesIssuesQuery,
} from 'generated/graphql'
import { startCase, truncate } from 'lodash'
import { useMemo } from 'react'
import { formatDateTime } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'

type WorkbenchIssue = {
  id: string
  title: string
  externalId: string
  provider: IssueWebhookProvider
  status: IssueStatus
  url: string
  insertedAt?: string | null
  updatedAt?: string | null
}

const columnHelper = createColumnHelper<WorkbenchIssue>()

const statusToChipSeverity: Record<IssueStatus, ChipSeverity> = {
  [IssueStatus.Open]: 'warning',
  [IssueStatus.InProgress]: 'info',
  [IssueStatus.Completed]: 'success',
  [IssueStatus.Cancelled]: 'neutral',
}

const columns = [
  columnHelper.accessor((issue) => issue, {
    id: 'title',
    header: 'Issue',
    meta: { gridTemplate: 'minmax(220px, 1fr)', truncate: true },
    cell: function Cell({ getValue }) {
      const issue = getValue()

      return (
        <StackedText
          first={issue.title}
          second={issue.externalId}
          firstPartialType="body2Bold"
          firstColor="text"
          secondPartialType="caption"
          secondColor="text-xlight"
          truncate
        />
      )
    },
  }),
  columnHelper.accessor((issue) => issue.status, {
    id: 'status',
    header: 'Status',
    cell: function Cell({ getValue }) {
      const status = getValue()

      return (
        <Chip
          size="small"
          severity={statusToChipSeverity[status]}
        >
          {startCase(status.toLowerCase())}
        </Chip>
      )
    },
  }),
  columnHelper.accessor((issue) => issue.provider, {
    id: 'provider',
    header: 'Provider',
    cell: function Cell({ getValue }) {
      return startCase(getValue().toLowerCase())
    },
  }),
  columnHelper.accessor((issue) => issue.updatedAt ?? issue.insertedAt, {
    id: 'updatedAt',
    header: 'Updated',
    cell: function Cell({ getValue }) {
      return getValue() ? formatDateTime(getValue(), 'M/D/YYYY h:mma') : '-'
    },
  }),
  columnHelper.accessor((issue) => issue.url, {
    id: 'url',
    header: 'URL',
    meta: { gridTemplate: 'minmax(220px, 1fr)' },
    cell: function Cell({ getValue }) {
      const url = getValue()

      return (
        <Tooltip
          placement="top"
          label={url}
        >
          <InlineA href={url}>{truncate(url, { length: 42 })}</InlineA>
        </Tooltip>
      )
    },
  }),
]

export function WorkbenchesIssues() {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      queryHook: useWorkbenchesIssuesQuery,
      keyPath: ['workbenchIssues'],
    })

  const issues = useMemo(() => mapExistingNodes(data?.workbenchIssues), [data])

  if (error) return <GqlError error={error} />

  return (
    <WorkbenchTabWrapper>
      <WorkbenchTabHeader title="Issues" />
      <Table
        fullHeightWrap
        virtualizeRows
        rowBg="base"
        data={issues}
        columns={columns}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        loading={!data && loading}
        emptyStateProps={{ message: 'No issues found.' }}
      />
    </WorkbenchTabWrapper>
  )
}
