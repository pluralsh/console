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
      columns={columns ?? [promptColumn, actionsColumn]}
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

export const actionsColumn = columnHelper.accessor((job) => job, {
  id: 'actions',
  cell: function Cell({ getValue }) {
    const theme = useTheme()
    const navigate = useNavigate()
    const { spacing } = theme
    const { alert, issue, pullRequests, result, evalResult, status, user } =
      getValue()
    const prs = pullRequests?.filter(isNonNullable) ?? []
    const workbenchId = getValue().workbench?.id

    return (
      <Flex
        gap="medium"
        align="center"
        justify="flex-end"
        width="100%"
      >
        {alert && (
          <AlertStateChip
            state={alert.state}
            {...(alert.url && {
              ...chipAsLinkProps,
              href: alert.url,
              tooltip: 'View alert',
            })}
          />
        )}
        {issue && (
          <IssueStatusChip
            status={issue.status}
            fillLevel={1}
            {...(issue.url && {
              ...chipAsLinkProps,
              href: issue.url,
              tooltip: 'View issue',
            })}
          />
        )}
        {result?.conclusion && (
          <ActivityModalIcon
            icon={PaperCheckIcon}
            tooltip="View conclusion"
            modalHeader="Conclusion"
            modalContent={
              <Card css={{ padding: spacing.large, overflow: 'auto' }}>
                <Markdown text={result?.conclusion} />
              </Card>
            }
            size={16}
          />
        )}
        <PRsModalIcon prs={prs} />
        {workbenchId && evalResult?.id && evalResult.grade != null && (
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
        )}
        <Tooltip
          placement="top"
          label={user?.name}
        >
          <AppIcon
            name={user?.name}
            size="xxsmall"
          />
        </Tooltip>
        <RunStatusIcon
          fullColor
          status={status}
        />
        <CaretRightIcon color="icon-xlight" />
      </Flex>
    )
  },
})

const chipAsLinkProps = {
  clickable: true,
  forwardedAs: 'a',
  target: '_blank',
  rel: 'noopener noreferrer',
}
