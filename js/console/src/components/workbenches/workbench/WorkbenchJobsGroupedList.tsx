import {
  CancelledFilledIcon,
  CheckOutlineIcon,
  ClockIcon,
  FailedFilledIcon,
  PauseIcon,
  SpinnerAlt,
} from '@pluralsh/design-system'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { truncateKeepingChips } from 'components/utils/contentEditableChips'
import { toCounts } from 'components/utils/display/DisplayPanel'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { EmptyListState } from 'components/workbenches/common/WorkbenchBoard'
import {
  GroupedListBody,
  GroupRowDateSC,
  GroupRowLinkSC,
  GroupRowRaisedSC,
  GroupRowSC,
  ListGroup,
  WorkbenchGroupedList,
} from 'components/workbenches/common/WorkbenchGroupedList'
import {
  SortDirection,
  useWorkbenchJobsForStatusQuery,
  useWorkbenchJobStatusCountsQuery,
  WorkbenchJobPrState,
  WorkbenchJobStatus,
  WorkbenchJobTinyFragment,
} from 'generated/graphql'
import { includes, startCase } from 'lodash'
import { memo, ReactElement, useMemo } from 'react'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'
import { WorkbenchJobActionsRow } from './WorkbenchJobsTable'
import { WORKBENCH_JOBS_PAGE_SIZE } from './workbenchJobsDisplay'
import { WorkbenchStoredPromptMarkdown } from './WorkbenchStoredPromptMarkdown'

// open jobs first, then finished ones by outcome
const GROUP_ORDER = [
  WorkbenchJobStatus.Running,
  WorkbenchJobStatus.Pending,
  WorkbenchJobStatus.Paused,
  WorkbenchJobStatus.Successful,
  WorkbenchJobStatus.Failed,
  WorkbenchJobStatus.Cancelled,
]

// cancelled jobs start collapsed (and so unloaded)
const DEFAULT_COLLAPSED: Partial<Record<WorkbenchJobStatus, boolean>> = {
  [WorkbenchJobStatus.Cancelled]: true,
}

const JOB_STATUS_COLORS: Record<
  WorkbenchJobStatus,
  ListGroup<WorkbenchJobStatus>['color']
> = {
  [WorkbenchJobStatus.Running]: 'icon-info',
  [WorkbenchJobStatus.Pending]: 'icon-light',
  [WorkbenchJobStatus.Paused]: 'icon-warning',
  [WorkbenchJobStatus.Failed]: 'icon-danger',
  [WorkbenchJobStatus.Successful]: 'icon-success',
  [WorkbenchJobStatus.Cancelled]: 'icon-xlight',
}

const JOB_STATUS_ICONS: Record<
  WorkbenchJobStatus,
  (props: { size: number; color: string }) => ReactElement
> = {
  [WorkbenchJobStatus.Running]: ({ size }) => <SpinnerAlt size={size} />,
  [WorkbenchJobStatus.Pending]: (props) => <ClockIcon {...props} />,
  [WorkbenchJobStatus.Paused]: (props) => <PauseIcon {...props} />,
  [WorkbenchJobStatus.Failed]: (props) => <FailedFilledIcon {...props} />,
  [WorkbenchJobStatus.Successful]: (props) => <CheckOutlineIcon {...props} />,
  [WorkbenchJobStatus.Cancelled]: (props) => <CancelledFilledIcon {...props} />,
}

function JobStatusIcon({ status }: { status: WorkbenchJobStatus }) {
  const Icon = JOB_STATUS_ICONS[status]

  return (
    <Icon
      size={14}
      color={JOB_STATUS_COLORS[status]}
    />
  )
}

// stable, so the paginated data callbacks don't change every render
const RUNS_KEY_PATH = ['workbench', 'runs']

type JobQueryFilters = {
  q?: string
  prStates?: WorkbenchJobPrState[]
  direction?: SortDirection
}

export function WorkbenchJobsGroupedList({
  workbenchId,
  statuses,
  filters,
  emptyState,
}: {
  workbenchId: string
  statuses: WorkbenchJobStatus[]
  filters: JobQueryFilters
  emptyState: EmptyListState
}) {
  const { data, previousData, loading } = useWorkbenchJobStatusCountsQuery({
    variables: { id: workbenchId, q: filters.q, prStates: filters.prStates },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const countsData = data ?? previousData
  const groups = useMemo(() => {
    if (!countsData) return undefined
    const counts = toCounts(
      countsData.workbench?.runCounts?.statuses,
      (e) => e.status
    )

    return GROUP_ORDER.filter(
      (status) => includes(statuses, status) && (counts[status] ?? 0) > 0
    ).map((status): ListGroup<WorkbenchJobStatus> => ({
      key: status,
      label: startCase(status.toLowerCase()),
      icon: <JobStatusIcon status={status} />,
      color: JOB_STATUS_COLORS[status],
      count: counts[status] ?? 0,
    }))
  }, [countsData, statuses])

  return (
    <WorkbenchGroupedList
      groups={groups}
      loading={loading}
      noun="jobs"
      emptyState={emptyState}
      defaultCollapsed={DEFAULT_COLLAPSED}
      renderGroup={(group, scrollEl) => (
        <JobStatusGroup
          workbenchId={workbenchId}
          status={group.key}
          count={group.count}
          filters={filters}
          scrollEl={scrollEl}
        />
      )}
    />
  )
}

function JobStatusGroup({
  workbenchId,
  status,
  count,
  filters,
  scrollEl,
}: {
  workbenchId: string
  status: WorkbenchJobStatus
  count: number
  filters: JobQueryFilters
  scrollEl: HTMLDivElement | null
}) {
  const { data, loading, pageInfo, fetchNextPage, fetchingMore } =
    useFetchPaginatedData(
      {
        queryHook: useWorkbenchJobsForStatusQuery,
        keyPath: RUNS_KEY_PATH,
        pageSize: WORKBENCH_JOBS_PAGE_SIZE,
        keepLoadedPages: true,
      },
      { id: workbenchId, status, ...filters }
    )
  const jobs = useMemo(() => mapExistingNodes(data?.workbench?.runs), [data])

  return (
    <GroupedListBody
      items={jobs}
      loading={!data && loading}
      count={count}
      pageInfo={pageInfo}
      fetchingMore={fetchingMore}
      fetchNextPage={fetchNextPage}
      scrollEl={scrollEl}
      getKey={(job) => job.id}
      renderRow={(job) => (
        <JobRow
          job={job}
          fallbackWorkbenchId={workbenchId}
        />
      )}
    />
  )
}

// a single line is shown, so there's no need to parse more than fits in it
const PROMPT_MAX_CHARS = 300

// memoized: rows re-render on every poll, and markdown parsing is the costly
// part of rendering one
const JobRow = memo(function JobRow({
  job,
  fallbackWorkbenchId,
}: {
  job: WorkbenchJobTinyFragment
  fallbackWorkbenchId: string
}) {
  return (
    <GroupRowSC>
      <GroupRowLinkSC
        to={getWorkbenchJobAbsPath({
          workbenchId: job.workbench?.id ?? fallbackWorkbenchId,
          jobId: job.id,
        })}
        aria-label="View job"
      />
      {job.status && <JobStatusIcon status={job.status} />}
      <PromptSC>
        <WorkbenchStoredPromptMarkdown
          text={truncateKeepingChips(job.prompt ?? '', PROMPT_MAX_CHARS)}
          density="tableCell"
          clampLines={1}
        />
      </PromptSC>
      <ChipsColumnSC>
        <WorkbenchJobActionsRow job={job} />
      </ChipsColumnSC>
      <GroupRowDateSC>
        {job.insertedAt ? formatDateTime(job.insertedAt, 'MMM D') : ''}
      </GroupRowDateSC>
    </GroupRowSC>
  )
})

// fixed width, so every row's prompt ends at the same point whatever its chips
const ChipsColumnSC = styled(GroupRowRaisedSC)({
  width: 280,
  justifyContent: 'flex-end',
})

const PromptSC = styled.div({
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
})
