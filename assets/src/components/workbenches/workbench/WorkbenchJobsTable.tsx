import {
  AppIcon,
  Card,
  CaretRightIcon,
  Flex,
  Markdown,
  PaperCheckIcon,
  Table,
  Tooltip,
} from '@pluralsh/design-system'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { RunStatusIcon } from 'components/ai/agent-runs/AgentRunInfoDisplays'
import { PRsModalIcon } from 'components/ai/agent-runs/AIAgentRunsTableCols'
import { GqlError } from 'components/utils/Alert'
import { AlertStateChip } from 'components/utils/alerts/AlertStateChip'
import { prettifyPrompt } from 'components/utils/contentEditableChips'
import {
  VirtualSlice,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'
import { CaptionP } from 'components/utils/typography/Text'
import { WorkbenchEvalGradeBadge } from 'components/workbenches/common/WorkbenchEvalGradeBadge'
import { IssueStatusChip } from 'components/workbenches/common/IssueStatusChip'
import {
  PageInfoFragment,
  WorkbenchJobTinyFragment,
  useWorkbenchJobsQuery,
} from 'generated/graphql'
import { truncate } from 'lodash'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getWorkbenchEvalResultAbsPath,
  getWorkbenchJobAbsPath,
} from 'routes/workbenchesRoutesConsts'
import { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { ActivityModalIcon } from './job/WorkbenchJobActivityResults'

export function WorkbenchJobsTable({ workbenchId }: { workbenchId: string }) {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useWorkbenchJobsQuery, keyPath: ['workbench', 'runs'] },
      { id: workbenchId }
    )
  const jobs = useMemo(() => mapExistingNodes(data?.workbench?.runs), [data])

  if (error) return <GqlError error={error} />

  return (
    <WorkbenchJobsTableContent
      jobs={jobs}
      loading={loading}
      loaded={!!data}
      pageInfo={pageInfo}
      fetchNextPage={fetchNextPage}
      setVirtualSlice={setVirtualSlice}
    />
  )
}

export function WorkbenchJobsTableContent({
  jobs,
  loading,
  loaded,
  pageInfo,
  fetchNextPage,
  setVirtualSlice,
  columns,
}: {
  jobs: WorkbenchJobTinyFragment[]
  loading: boolean
  loaded: boolean
  pageInfo: PageInfoFragment | undefined
  fetchNextPage: () => void
  setVirtualSlice: (slice: VirtualSlice) => void
  columns?: ColumnDef<WorkbenchJobTinyFragment, any>[]
}) {
  return (
    <Table
      hideHeader
      fullHeightWrap
      virtualizeRows
      data={jobs}
      columns={columns ?? [userColumn, promptColumn, ...actionColumns]}
      loading={!loaded && loading}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      emptyStateProps={{ message: 'No jobs found.' }}
      getRowLink={({ original }) => {
        const { id: jobId, workbench } = original as WorkbenchJobTinyFragment
        return (
          <Link
            to={getWorkbenchJobAbsPath({
              workbenchId: workbench?.id ?? '',
              jobId,
            })}
          />
        )
      }}
    />
  )
}

const columnHelper = createColumnHelper<WorkbenchJobTinyFragment>()

export const userColumn = columnHelper.accessor(({ user }) => user, {
  id: 'user',
  meta: { gridTemplate: '60px' },
  cell: ({ getValue }) => {
    const user = getValue()
    if (!user) return null

    return (
      <Flex
        grow={1}
        align="center"
      >
        <Tooltip
          placement="top"
          label={user.name}
        >
          <AppIcon
            name={user.name}
            size="xxsmall"
            css={{ marginLeft: 5, borderRadius: '50%' }}
          />
        </Tooltip>
      </Flex>
    )
  },
})

export const promptColumn = columnHelper.accessor(
  ({ prompt }) => truncate(prettifyPrompt(prompt ?? ''), { length: 150 }),
  { id: 'prompt', meta: { gridTemplate: '1fr' } }
)

export const workbenchColumn = columnHelper.accessor(
  ({ workbench }) => workbench?.name,
  {
    id: 'workbench',
    cell: ({ getValue }) => {
      const workbenchName = getValue()
      if (!workbenchName) return null

      return <CaptionP $color="text-xlight">{workbenchName}</CaptionP>
    },
  }
)

export const alertColumn = columnHelper.accessor((job) => job.alert, {
  id: 'alert',
  meta: { center: true },
  cell: ({ getValue }) => {
    const alert = getValue()
    if (!alert) return null

    return (
      <AlertStateChip
        state={alert.state}
        {...(alert.url && {
          ...chipAsLinkProps,
          href: alert.url,
          tooltip: 'View alert',
        })}
      />
    )
  },
})

export const issueColumn = columnHelper.accessor((job) => job.issue, {
  id: 'issue',
  meta: { gridTemplate: 'minmax(80px, max-content)', center: true },
  cell: ({ getValue }) => {
    const issue = getValue()
    if (!issue) return null

    return (
      <IssueStatusChip
        status={issue.status}
        fillLevel={1}
        {...(issue.url && {
          ...chipAsLinkProps,
          href: issue.url,
          tooltip: 'View issue',
        })}
      />
    )
  },
})

export const conclusionColumn = columnHelper.accessor((job) => job.result, {
  id: 'conclusion',
  meta: { gridTemplate: 'minmax(40px, max-content)', center: true },
  cell: function Cell({ getValue }) {
    const theme = useTheme()
    const result = getValue()

    if (!result?.conclusion) return null

    return (
      <ActivityModalIcon
        icon={PaperCheckIcon}
        tooltip="View conclusion"
        modalHeader="Conclusion"
        modalContent={
          <Card css={{ padding: theme.spacing.large, overflow: 'auto' }}>
            <Markdown text={result.conclusion} />
          </Card>
        }
        size={16}
      />
    )
  },
})

export const prsColumn = columnHelper.accessor((job) => job.pullRequests, {
  id: 'prs',
  meta: { gridTemplate: 'minmax(40px, max-content)', center: true },
  cell: ({ getValue }) => {
    const prs = getValue()?.filter(isNonNullable) ?? []
    return <PRsModalIcon prs={prs} />
  },
})

export const evalResultColumn = columnHelper.accessor((job) => job, {
  id: 'eval',
  meta: { gridTemplate: 'minmax(40px, max-content)', center: true },
  cell: function Cell({ getValue }) {
    const navigate = useNavigate()
    const { evalResult, workbench } = getValue()
    const workbenchId = workbench?.id

    if (!workbenchId || !evalResult?.id || evalResult.grade == null) return null

    return (
      <WorkbenchEvalGradeBadge
        grade={evalResult.grade}
        tooltip="View eval details"
        onClick={(e) => {
          e.stopPropagation()
          navigate(
            getWorkbenchEvalResultAbsPath({
              workbenchId,
              evalResultId: evalResult.id,
            })
          )
        }}
      />
    )
  },
})

export const statusColumn = columnHelper.accessor((job) => job.status, {
  id: 'status',
  meta: { gridTemplate: 'minmax(36px, max-content)', center: true },
  cell: ({ getValue }) => (
    <RunStatusIcon
      fullColor
      status={getValue()}
    />
  ),
})

export const rowNavColumn = columnHelper.display({
  id: 'row-nav',
  meta: { gridTemplate: '40px' },
  cell: () => <CaretRightIcon color="icon-xlight" />,
})

export const actionColumns: ColumnDef<WorkbenchJobTinyFragment, any>[] = [
  alertColumn,
  issueColumn,
  conclusionColumn,
  prsColumn,
  evalResultColumn,
  statusColumn,
  rowNavColumn,
]

const chipAsLinkProps = {
  clickable: true,
  forwardedAs: 'a',
  target: '_blank',
  rel: 'noopener noreferrer',
}
