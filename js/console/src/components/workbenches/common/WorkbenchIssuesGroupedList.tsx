import { CaretDownIcon, Spinner } from '@pluralsh/design-system'
import { useVirtualizer } from '@tanstack/react-virtual'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { toCounts } from 'components/utils/display/DisplayPanel'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { IssueLink } from 'components/workbenches/common/IssueLink'
import { WorkbenchViewJobChip } from 'components/workbenches/common/WorkbenchViewJobChip'
import {
  IssueSort,
  IssueStatus,
  IssueWebhookProvider,
  SortDirection,
  useWorkbenchIssuesForStatusQuery,
  useWorkbenchIssueStatusCountsQuery,
  WorkbenchIssueFragment,
} from 'generated/graphql'
import { includes } from 'lodash'
import { cloneElement, memo, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'
import { ensureURLValidity } from 'utils/url'
import { ISSUE_STATUS_ICONS } from './IssueStatusChip'
import { ISSUE_STATUS_LABELS, ISSUE_STATUS_OPTIONS } from './issueStatus'
import {
  BoardEmptyList,
  EmptyListState,
  LoadMoreSentinel,
  useScrollMargin,
} from './WorkbenchBoard'

const PAGE_SIZE = 50
const ROW_HEIGHT = 44

// stable, so the paginated data callbacks don't change every render
const ISSUES_KEY_PATH = ['workbench', 'issues']

type IssueQueryFilters = {
  q?: string
  providers?: IssueWebhookProvider[]
  sort?: IssueSort
  direction?: SortDirection
}

// Issues grouped by status, each group paged on its own. A group's header
// sticks to the top while scrolling through it, until the next one takes over.
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
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const [collapsed, setCollapsed] = useState<
    Partial<Record<IssueStatus, boolean>>
  >({})

  const { data, previousData, loading } = useWorkbenchIssueStatusCountsQuery({
    variables: { id: workbenchId, q: filters.q, providers: filters.providers },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const countsData = data ?? previousData
  const counts = useMemo(
    () =>
      toCounts(countsData?.workbench?.issueCounts?.statuses, (e) => e.status),
    [countsData]
  )
  const groups = ISSUE_STATUS_OPTIONS.filter(
    (status) => includes(statuses, status) && (counts[status] ?? 0) > 0
  )

  if (!countsData || groups.length === 0) {
    return (
      <BoardEmptyList
        noun="issues"
        loading={!countsData && loading}
        emptyState={emptyState}
      />
    )
  }

  return (
    <ListSC ref={setScrollEl}>
      {groups.map((status) => (
        <IssueStatusGroup
          key={status}
          workbenchId={workbenchId}
          status={status}
          count={counts[status] ?? 0}
          filters={filters}
          scrollEl={scrollEl}
          collapsed={!!collapsed[status]}
          onToggle={() =>
            setCollapsed((prev) => ({ ...prev, [status]: !prev[status] }))
          }
        />
      ))}
    </ListSC>
  )
}

function IssueStatusGroup({
  workbenchId,
  status,
  count,
  filters,
  scrollEl,
  collapsed,
  onToggle,
}: {
  workbenchId: string
  status: IssueStatus
  count: number
  filters: IssueQueryFilters
  scrollEl: HTMLDivElement | null
  collapsed: boolean
  onToggle: () => void
}) {
  const { data, loading, pageInfo, fetchNextPage, fetchingMore } =
    useFetchPaginatedData(
      {
        queryHook: useWorkbenchIssuesForStatusQuery,
        keyPath: ISSUES_KEY_PATH,
        pageSize: PAGE_SIZE,
        keepLoadedPages: true,
        // collapsed groups neither load nor poll
        skip: collapsed,
      },
      { id: workbenchId, status, ...filters }
    )
  const issues = useMemo(
    () => mapExistingNodes(data?.workbench?.issues),
    [data]
  )

  return (
    <GroupSC>
      <GroupHeaderSC
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
      >
        <CaretDownIcon
          size={10}
          color="icon-xlight"
          css={{
            transform: collapsed ? 'rotate(-90deg)' : undefined,
            transition: 'transform 0.15s ease',
          }}
        />
        {cloneElement(ISSUE_STATUS_ICONS[status], { size: 14 })}
        <span>{ISSUE_STATUS_LABELS[status]}</span>
        <GroupCountSC>{count}</GroupCountSC>
      </GroupHeaderSC>
      {!collapsed &&
        (!data && loading ? (
          <GroupLoadingSC>
            <Spinner />
          </GroupLoadingSC>
        ) : (
          <>
            <VirtualIssueRows
              issues={issues}
              scrollEl={scrollEl}
              fallbackWorkbenchId={workbenchId}
            />
            <LoadMoreSentinel
              fetchingMore={fetchingMore}
              hasNextPage={!!pageInfo?.hasNextPage}
              fetchNextPage={fetchNextPage}
            />
          </>
        ))}
    </GroupSC>
  )
}

function VirtualIssueRows({
  issues,
  scrollEl,
  fallbackWorkbenchId,
}: {
  issues: WorkbenchIssueFragment[]
  scrollEl: HTMLDivElement | null
  fallbackWorkbenchId: string
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const scrollMargin = useScrollMargin(listRef, scrollEl)

  const virtualizer = useVirtualizer({
    count: issues.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    scrollMargin,
  })
  const items = virtualizer.getVirtualItems()

  return (
    <div
      ref={listRef}
      css={{ position: 'relative', height: virtualizer.getTotalSize() }}
    >
      <div
        css={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
        style={{
          transform: `translateY(${(items[0]?.start ?? 0) - scrollMargin}px)`,
        }}
      >
        {items.map((item) => {
          const issue = issues[item.index]

          return (
            issue && (
              <IssueRow
                key={issue.id}
                issue={issue}
                fallbackWorkbenchId={fallbackWorkbenchId}
              />
            )
          )
        })}
      </div>
    </div>
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
    <RowSC>
      {href && (
        <RowTargetSC
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={issue.title}
        />
      )}
      {issue.status &&
        cloneElement(ISSUE_STATUS_ICONS[issue.status], { size: 14 })}
      <RowTitleSC>{issue.title}</RowTitleSC>
      <RowRaisedSC>
        {workbenchJobId && (
          <WorkbenchViewJobChip
            workbenchId={workbenchId}
            jobId={workbenchJobId}
            status={issue.workbenchJob?.status}
          />
        )}
        <IssueLink
          url={issue.url}
          provider={issue.provider}
        />
      </RowRaisedSC>
      <RowDateSC>
        {issue.insertedAt ? formatDateTime(issue.insertedAt, 'MMM D') : ''}
      </RowDateSC>
    </RowSC>
  )
})

const ListSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  width: '100%',
  minWidth: 0,
  minHeight: 0,
  overflowX: 'hidden',
  overflowY: 'auto',
})

// the sticky header's containing block, so the next group pushes it out
const GroupSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
})

const GroupHeaderSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.body2Bold,
  position: 'sticky',
  top: 0,
  zIndex: 2,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  height: 36,
  flexShrink: 0,
  padding: `0 ${theme.spacing.medium}px`,
  color: theme.colors.text,
  backgroundColor: theme.colors['fill-one'],
  borderRadius: theme.borderRadiuses.medium,
  cursor: 'pointer',
  '&:hover': { backgroundColor: theme.colors['fill-one-hover'] },
  '&:focus-visible': { outline: theme.borders['outline-focused'] },
}))

const GroupCountSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-xlight'],
}))

const GroupLoadingSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  padding: theme.spacing.medium,
}))

const RowSC = styled.div(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  height: ROW_HEIGHT,
  padding: `0 ${theme.spacing.medium}px`,
  borderRadius: theme.borderRadiuses.medium,
  // the row's own target, not a link or chip in it
  '&:has(> a:hover)': { backgroundColor: theme.colors['fill-zero-hover'] },
}))

// the whole row opens the issue, under the row's own links
const RowTargetSC = styled.a(({ theme }) => ({
  position: 'absolute',
  inset: 0,
  borderRadius: 'inherit',
  '&:focus-visible': { outline: theme.borders['outline-focused'] },
}))

const RowTitleSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: theme.colors.text,
  pointerEvents: 'none',
}))

const RowRaisedSC = styled.div(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  flexShrink: 0,
  maxWidth: '40%',
  minWidth: 0,
}))

const RowDateSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  flexShrink: 0,
  width: 48,
  textAlign: 'right',
  color: theme.colors['text-xlight'],
  pointerEvents: 'none',
}))
