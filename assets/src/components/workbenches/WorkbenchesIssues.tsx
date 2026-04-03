import {
  ArrowTopRightIcon,
  Chip,
  Flex,
  Table,
  TicketIcon,
  Tooltip,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { IssueStatusChip } from 'components/workbenches/common/IssueStatusChip'
import { WorkbenchTabHeader } from 'components/workbenches/common/WorkbenchTabHeader'
import { WorkbenchTabWrapper } from 'components/workbenches/common/WorkbenchTabWrapper'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { InlineA } from 'components/utils/typography/Text'
import {
  WorkbenchIssueFragment,
  useWorkbenchesIssuesQuery,
} from 'generated/graphql'
import { truncate } from 'lodash'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDateTime } from 'utils/datetime'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'

const columnHelper = createColumnHelper<WorkbenchIssueFragment>()

const columns = [
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
      const workbenchId = issue.workbench?.id
      const firstJobId = issue.workbench?.runs?.edges?.[0]?.node?.id

      if (!workbenchId || !firstJobId) return null

      return (
        <Chip
          clickable
          onclick={() =>
            navigate(getWorkbenchJobAbsPath({ workbenchId, jobId: firstJobId }))
          }
          size="large"
        >
          View job
        </Chip>
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
      <WorkbenchTabHeader
        title="Issues"
        icon={<TicketIcon />}
      />
      <Table
        fullHeightWrap
        virtualizeRows
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
