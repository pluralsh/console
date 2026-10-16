import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { toCounts } from 'components/utils/display/DisplayPanel'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { IssueLink } from 'components/workbenches/common/IssueLink'
import { WorkbenchJobPrChip } from 'components/workbenches/common/WorkbenchJobPrIcon'
import { WorkbenchViewJobChip } from 'components/workbenches/common/WorkbenchViewJobChip'
import {
  IssueSort,
  IssueStatus,
  IssueWebhookProvider,
  SortDirection,
  useWorkbenchIssueStatusCountsQuery,
  WorkbenchIssueFragment,
  WorkbenchIssuesForStatusDocument,
  WorkbenchIssuesForStatusQuery,
  WorkbenchIssuesForStatusQueryVariables,
} from 'generated/graphql'
import { includes } from 'lodash'
import { memo, useMemo } from 'react'
import { formatDateTime } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'
import { ensureURLValidity } from 'utils/url'
import { ISSUE_STATUS_COLORS, IssueStatusGlyph } from './IssueStatusGlyph'
import { ISSUE_STATUS_LABELS } from './issueStatus'
import { EmptyListState } from './WorkbenchBoard'
import {
  GroupedListBody,
  GroupRowAnchorSC,
  GroupRowDateSC,
  GroupRowRaisedSC,
  GroupRowSC,
  GroupRowTitleSC,
  ListGroup,
  WorkbenchGroupedList,
} from './WorkbenchGroupedList'

const PAGE_SIZE = 50

// active work first, unlike the board's left-to-right flow
const GROUP_ORDER = [
  IssueStatus.InProgress,
  IssueStatus.Open,
  IssueStatus.Completed,
  IssueStatus.Cancelled,
]

// closed groups start collapsed (and so unloaded)
const DEFAULT_COLLAPSED: Partial<Record<IssueStatus, boolean>> = {
  [IssueStatus.Completed]: true,
  [IssueStatus.Cancelled]: true,
}

// stable, so the paginated data callbacks don't change every render
const ISSUES_KEY_PATH = ['workbench', 'issues']

type IssueQueryFilters = {
  q?: string
  providers?: IssueWebhookProvider[]
  sort?: IssueSort
  direction?: SortDirection
}

export function WorkbenchIssuesGroupedList({
  workbenchId,
  statuses,
  filters,
  emptyState,
}: {
  workbenchId: string
  statuses: IssueStatus[]
  filters: IssueQueryFilters
  emptyState: EmptyListState
}) {
  const { data, previousData, loading } = useWorkbenchIssueStatusCountsQuery({
    variables: { id: workbenchId, q: filters.q, providers: filters.providers },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const countsData = data ?? previousData
  const groups = useMemo(() => {
    if (!countsData) return undefined
    const counts = toCounts(
      countsData.workbench?.issueCounts?.statuses,
      (e) => e.status
    )

    return GROUP_ORDER.filter(
      (status) => includes(statuses, status) && (counts[status] ?? 0) > 0
    ).map(
      (status): ListGroup<IssueStatus> => ({
        key: status,
        label: ISSUE_STATUS_LABELS[status],
        icon: <IssueStatusGlyph status={status} />,
        color: ISSUE_STATUS_COLORS[status],
        count: counts[status] ?? 0,
      })
    )
  }, [countsData, statuses])

  return (
    <WorkbenchGroupedList
      groups={groups}
      loading={loading}
      noun="issues"
      emptyState={emptyState}
      defaultCollapsed={DEFAULT_COLLAPSED}
      renderGroup={(group, scrollEl) => (
        <IssueStatusGroup
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

function IssueStatusGroup({
  workbenchId,
  status,
  count,
  filters,
  scrollEl,
}: {
  workbenchId: string
  status: IssueStatus
  count: number
  filters: IssueQueryFilters
  scrollEl: HTMLDivElement | null
}) {
  const { data, loading, pageInfo, fetchNextPage, fetchingMore } =
    useFetchPaginatedData<
      WorkbenchIssuesForStatusQuery,
      WorkbenchIssuesForStatusQueryVariables
    >(
      {
        query: WorkbenchIssuesForStatusDocument,
        keyPath: ISSUES_KEY_PATH,
        pageSize: PAGE_SIZE,
        keepLoadedPages: true,
      },
      { id: workbenchId, status, ...filters }
    )
  const issues = useMemo(
    () => mapExistingNodes(data?.workbench?.issues),
    [data]
  )

  return (
    <GroupedListBody
      items={issues}
      loading={!data && loading}
      count={count}
      pageInfo={pageInfo}
      fetchingMore={fetchingMore}
      fetchNextPage={fetchNextPage}
      scrollEl={scrollEl}
      getKey={(issue) => issue.id}
      renderRow={(issue) => (
        <IssueRow
          issue={issue}
          fallbackWorkbenchId={workbenchId}
        />
      )}
    />
  )
}

const IssueRow = memo(function IssueRow({
  issue,
  fallbackWorkbenchId,
}: {
  issue: WorkbenchIssueFragment
  fallbackWorkbenchId: string
}) {
  const href = issue.url ? ensureURLValidity(issue.url) : ''
  const workbenchId = issue.workbench?.id ?? fallbackWorkbenchId
  const workbenchJobId = issue.workbenchJob?.id

  return (
    <GroupRowSC>
      {href && (
        <GroupRowAnchorSC
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={issue.title}
        />
      )}
      {issue.status && <IssueStatusGlyph status={issue.status} />}
      <GroupRowTitleSC>{issue.title}</GroupRowTitleSC>
      <GroupRowRaisedSC>
        <IssueLink
          url={issue.url}
          provider={issue.provider}
        />
        <WorkbenchJobPrChip pullRequests={issue.workbenchJob?.pullRequests} />
        {workbenchJobId && (
          <WorkbenchViewJobChip
            workbenchId={workbenchId}
            jobId={workbenchJobId}
            status={issue.workbenchJob?.status}
          />
        )}
      </GroupRowRaisedSC>
      <GroupRowDateSC>
        {issue.insertedAt ? formatDateTime(issue.insertedAt, 'MMM D') : ''}
      </GroupRowDateSC>
    </GroupRowSC>
  )
})
