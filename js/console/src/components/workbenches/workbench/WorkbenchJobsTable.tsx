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
import { WorkbenchQueuedPromptChip } from 'components/workbenches/common/WorkbenchQueuedPromptChip'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { RunStatusIcon } from 'components/ai/agent-runs/AgentRunInfoDisplays'
import { PRsModalIcon } from 'components/ai/agent-runs/AIAgentRunsTableCols'
import { AlertStateChip } from 'components/utils/alerts/AlertStateChip'
import { VirtualSlice } from 'components/utils/table/useFetchPaginatedData'
import { CaptionP } from 'components/utils/typography/Text'
import { truncateKeepingChips } from 'components/utils/contentEditableChips'
import { WorkbenchStoredPromptMarkdown } from 'components/workbenches/workbench/WorkbenchStoredPromptMarkdown'
import { WorkbenchEvalGradeBadge } from 'components/workbenches/common/WorkbenchEvalGradeBadge'
import { IssueStatusChip } from 'components/workbenches/common/IssueStatusChip'
import { WorkbenchUsageSummaryChip } from 'components/workbenches/common/WorkbenchUsageChips'
import { PageInfoFragment, WorkbenchJobTinyFragment } from 'generated/graphql'
import { memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getWorkbenchEvalResultAbsPath,
  getWorkbenchJobAbsPath,
} from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { ActivityModalIcon } from './job/WorkbenchJobActivityResults'
import {
  chatProviderConnectionIcon,
  chatProviderConnectionLabel,
} from './chatbots/utils'

// rows are fixed-height (see RowHeightSC), so the virtualizer needn't measure
const WORKBENCH_JOB_ROW_HEIGHT = 52
const getWorkbenchJobRowHeight = () => WORKBENCH_JOB_ROW_HEIGHT

export function WorkbenchJobsTableContent({
  jobs,
  loading,
  loaded,
  fetchingMore,
  pageInfo,
  fetchNextPage,
  setVirtualSlice,
  columns,
}: {
  jobs: WorkbenchJobTinyFragment[]
  loading: boolean
  loaded: boolean
  // a next page in flight; polls also go through fetchMore, so not `loading`
  fetchingMore: boolean
  pageInfo: PageInfoFragment | undefined
  fetchNextPage: () => void
  setVirtualSlice: (slice: VirtualSlice) => void
  columns?: ColumnDef<WorkbenchJobTinyFragment, any>[]
}) {
  return (
    <RowHeightSC>
      <Table
        hideHeader
        fullHeightWrap
        virtualizeRows
        lockColumnsOnScroll={false}
        reactVirtualOptions={{
          estimateSize: getWorkbenchJobRowHeight,
          measureElement: getWorkbenchJobRowHeight,
        }}
        overflowX="hidden"
        data={jobs}
        columns={
          columns ?? [userColumn, promptColumn, usageColumn, ...actionColumns]
        }
        loading={!loaded && loading}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={fetchingMore}
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
    </RowHeightSC>
  )
}

// pins every row to the height the virtualizer assumes, so a taller cell can't
// shift the rows below it; the virtualizer's filler rows set their own height.
// no overflow clipping: the row link's cell is 0 wide and overflows by design
const RowHeightSC = styled.div({
  height: '100%',
  '& td:not([aria-hidden])': {
    height: WORKBENCH_JOB_ROW_HEIGHT,
  },
})

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
    cell: ({ getValue }) => <PromptCell text={getValue()} />,
  }
)

// a single line is shown, so there's no need to parse more than fits in it
const PROMPT_CELL_MAX_CHARS = 300

// memoized: rows re-render on every poll, and markdown parsing is the costly
// part of rendering a row
const PromptCell = memo(function PromptCell({ text }: { text: string }) {
  return (
    <div css={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
      <WorkbenchStoredPromptMarkdown
        text={truncateKeepingChips(text, PROMPT_CELL_MAX_CHARS)}
        density="tableCell"
        clampLines={1}
      />
    </div>
  )
})

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

export const usageColumn = columnHelper.accessor(({ usage }) => usage, {
  id: 'usage',
  meta: { gridTemplate: '120px' },
  cell: ({ getValue, row }) => (
    <WorkbenchUsageSummaryChip
      usage={getValue()}
      budget={row.original.modes?.budget}
      error={row.original.error}
    />
  ),
})

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
        e.preventDefault()
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
    !!job.result?.conclusion ||
    (job.queuedPromptCount ?? 0) > 0

  if (!hasActions) return null

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      css={{
        display: 'flex',
        gap: theme.spacing.small,
        alignItems: 'center',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <JobSourceChips
        job={job}
        fillLevel={chipFillLevel}
      />
      <PRsModalIcon
        prs={prs}
        type="tertiary"
      />
      <JobEvalBadge job={job} />
      <JobConclusionIcon result={job.result} />
      <WorkbenchQueuedPromptChip
        count={job.queuedPromptCount}
        summary={job.queuedPromptSummary}
        fillLevel={chipFillLevel}
      />
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
        minWidth: 0,
        overflow: 'hidden',
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
      <CaretRightIcon
        color="icon-xlight"
        size={12}
      />
    </div>
  )
}

export const actionsColumn = columnHelper.display({
  id: 'actions',
  // fixed, as fit-content would resize with whichever rows are rendered
  meta: { gridTemplate: '220px' },
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
