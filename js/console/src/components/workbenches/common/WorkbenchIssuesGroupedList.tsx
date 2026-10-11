import { CaretDownIcon, PlusIcon, Spinner } from '@pluralsh/design-system'
import { useVirtualizer } from '@tanstack/react-virtual'
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
  useWorkbenchIssuesForStatusQuery,
  useWorkbenchIssueStatusCountsQuery,
  WorkbenchIssueFragment,
} from 'generated/graphql'
import chroma from 'chroma-js'
import { includes } from 'lodash'
import { memo, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'
import { ensureURLValidity } from 'utils/url'
import { ISSUE_STATUS_COLORS, IssueStatusGlyph } from './IssueStatusGlyph'
import { ISSUE_STATUS_LABELS } from './issueStatus'
import {
  BoardEmptyList,
  EmptyListState,
  useScrollMargin,
} from './WorkbenchBoard'

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
  const [collapsed, setCollapsed] =
    useState<Partial<Record<IssueStatus, boolean>>>(DEFAULT_COLLAPSED)

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
  const groups = GROUP_ORDER.filter(
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
        $color={ISSUE_STATUS_COLORS[status]}
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
        <IssueStatusGlyph status={status} />
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
            {pageInfo?.hasNextPage && (
              <ViewMoreButton
                remaining={Math.max(count - issues.length, 0)}
                endCursor={pageInfo.endCursor}
                fetchingMore={fetchingMore}
                fetchNextPage={fetchNextPage}
              />
            )}
          </>
        ))}
    </GroupSC>
  )
}

// Loads a group's next page on demand. Polls also show as `fetchingMore`, so
// it only spins for a page requested from the cursor it's still on.
function ViewMoreButton({
  remaining,
  endCursor,
  fetchingMore,
  fetchNextPage,
}: {
  remaining: number
  endCursor: Nullable<string>
  fetchingMore: boolean
  fetchNextPage: () => void
}) {
  const [requestedFrom, setRequestedFrom] = useState<Nullable<string>>()
  const loadingMore = fetchingMore && requestedFrom === endCursor

  return (
    <ViewMoreSC
      type="button"
      disabled={loadingMore}
      onClick={() => {
        setRequestedFrom(endCursor)
        fetchNextPage()
      }}
    >
      {loadingMore ? <Spinner size={14} /> : <PlusIcon size={14} />}
      View more
      {remaining > 0 && <GroupCountSC>{remaining}</GroupCountSC>}
    </ViewMoreSC>
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
    // it scrolls its element to this on mount, which would jump the shared list
    // to the top whenever a group is expanded
    initialOffset: () => scrollEl?.scrollTop ?? 0,
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
      {issue.status && <IssueStatusGlyph status={issue.status} />}
      <RowTitleSC>{issue.title}</RowTitleSC>
      <RowRaisedSC>
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

// tinted with its status color, but opaque, so the rows scroll under it unseen.
// Light mode's zero fill is white on a near-white page, so it steps up there.
const GroupHeaderSC = styled.button<{ $color: IssueStatusColor }>(
  ({ theme, $color }) => {
    const light = theme.mode === 'light'
    const fill = theme.colors[light ? 'fill-two' : 'fill-zero']
    const hoverFill = theme.colors[light ? 'fill-two-hover' : 'fill-zero-hover']

    return {
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
      marginBottom: theme.spacing.xxsmall,
      padding: `0 ${theme.spacing.medium}px`,
      color: theme.colors.text,
      backgroundColor: statusTint(fill, theme.colors[$color]),
      borderRadius: theme.borderRadiuses.large,
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: statusTint(hoverFill, theme.colors[$color]),
      },
      // only for keyboard focus, not after a click
      '&:focus': { outline: 'none' },
      '&:focus-visible': { outline: theme.borders['outline-focused'] },
    }
  }
)

type IssueStatusColor = (typeof ISSUE_STATUS_COLORS)[IssueStatus]

function statusTint(fill: string, color: string) {
  try {
    return chroma.mix(fill, color, 0.04, 'rgb').hex()
  } catch {
    return fill
  }
}

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
  borderRadius: theme.borderRadiuses.large,
  // the row's own target, not a link or chip in it
  '&:has(> a:hover)': { backgroundColor: theme.colors['fill-zero-hover'] },
}))

// laid out like a row, its icon in the rows' status icon column
const ViewMoreSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.body2,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  height: 36,
  flexShrink: 0,
  marginBottom: theme.spacing.small,
  padding: `0 ${theme.spacing.medium}px`,
  borderRadius: theme.borderRadiuses.large,
  color: theme.colors['text-light'],
  cursor: 'pointer',
  '&:hover:not(:disabled)': {
    backgroundColor: theme.colors['fill-zero-hover'],
    color: theme.colors.text,
  },
  '&:disabled': { cursor: 'default' },
  '&:focus-visible': { outline: theme.borders['outline-focused'] },
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
