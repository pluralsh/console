import {
  AppIcon,
  Card,
  CaretRightIcon,
  Chip,
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
import { WorkbenchStoredPromptMarkdown } from 'components/workbenches/workbench/WorkbenchStoredPromptMarkdown'
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
import {
  chatProviderConnectionIcon,
  chatProviderConnectionLabel,
} from './chatbots/utils'

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
          />
        </Tooltip>
      </Flex>
    )
  },
})

export const promptColumn = columnHelper.accessor(
  ({ prompt }) => prompt ?? '',
  {
    id: 'prompt',
    meta: { gridTemplate: 'minmax(0, 1fr)' },
    cell: ({ getValue }) => (
      <WorkbenchStoredPromptMarkdown
        text={getValue()}
        density="tableCell"
        clampLines={1}
      />
    ),
  }
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

function JobSourceChips({
  job,
  fillLevel = 1,
}: {
  job: WorkbenchJobTinyFragment
  fillLevel?: 1 | 2 | 3
}) {
  const { issue, alert, chatbotMessage } = job
  if (!issue && !alert && !chatbotMessage) return null

  return (
    <>
      {chatbotMessage && (
        <Chip
          size="small"
          severity="neutral"
          fillLevel={fillLevel}
          truncateWidth={80}
          icon={chatProviderConnectionIcon(chatbotMessage.chatConnection?.type)}
          tooltip={
            chatbotMessage.chatConnection
              ? `${chatProviderConnectionLabel(chatbotMessage.chatConnection.type)}: ${chatbotMessage.chatConnection.name}`
              : 'Chatbot'
          }
        >
          {chatbotMessage.channel}
        </Chip>
      )}
      {issue && (
        <span css={{ display: 'inline-flex', flexShrink: 0 }}>
          <IssueStatusChip
            status={issue.status}
            fillLevel={fillLevel}
            {...(issue.url && {
              ...chipAsLinkProps,
              href: issue.url,
              tooltip: 'View issue',
            })}
          />
        </span>
      )}
      {alert && (
        <AlertStateChip
          fillLevel={fillLevel}
          state={alert.state}
          {...(alert.url && {
            ...chipAsLinkProps,
            href: alert.url,
            tooltip: 'View alert',
          })}
        />
      )}
    </>
  )
}

export function JobConclusionIcon({
  result,
}: {
  result: WorkbenchJobTinyFragment['result']
}) {
  const theme = useTheme()

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
}

function JobEvalBadge({ job }: { job: WorkbenchJobTinyFragment }) {
  const navigate = useNavigate()
  const { evalResult, workbench } = job
  const workbenchId = workbench?.id

  if (!workbenchId || !evalResult?.id || evalResult.grade == null) return null

  return (
    <WorkbenchEvalGradeBadge
      grade={evalResult.grade}
      size="xsmall"
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
}

export function WorkbenchJobActionsRow({
  job,
  chipFillLevel = 1,
}: {
  job: WorkbenchJobTinyFragment
  chipFillLevel?: 1 | 2 | 3
}) {
  const theme = useTheme()
  const prs = job.pullRequests?.filter(isNonNullable) ?? []
  const hasActions =
    !!job.issue ||
    !!job.alert ||
    !!job.chatbotMessage ||
    prs.length > 0 ||
    job.evalResult?.grade != null ||
    !!job.result?.conclusion

  if (!hasActions) return null

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      css={{
        display: 'flex',
        gap: theme.spacing.small,
        alignItems: 'center',
      }}
    >
      <JobSourceChips
        job={job}
        fillLevel={chipFillLevel}
      />
      <PRsModalIcon prs={prs} />
      <JobEvalBadge job={job} />
      <JobConclusionIcon result={job.result} />
    </div>
  )
}

function JobActionsCell({ job }: { job: WorkbenchJobTinyFragment }) {
  const theme = useTheme()

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      css={{
        width: '100%',
        display: 'flex',
        gap: theme.spacing.small,
        alignItems: 'center',
        justifyContent: 'end',
      }}
    >
      <WorkbenchJobActionsRow job={job} />
      <RunStatusIcon
        fullColor
        status={job.status}
      />
      <CaretRightIcon color="icon-xlight" />
    </div>
  )
}

export const actionsColumn = columnHelper.display({
  id: 'actions',
  meta: { gridTemplate: 'min-content' },
  cell: ({ row: { original } }) => <JobActionsCell job={original} />,
})

export const actionColumns: ColumnDef<WorkbenchJobTinyFragment, any>[] = [
  actionsColumn,
]

const chipAsLinkProps = {
  clickable: true,
  forwardedAs: 'a',
  target: '_blank',
  rel: 'noopener noreferrer',
}
