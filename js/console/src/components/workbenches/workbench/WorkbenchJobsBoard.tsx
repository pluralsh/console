import { useVirtualizer } from '@tanstack/react-virtual'
import {
  BoardCardGridSC,
  BoardEmptyList,
  EmptyListState,
  BoardSC,
  BoardSectionSC,
  BoardTitle,
  BoardTitleSC,
  LoadMoreSentinel,
  useScrollMargin,
} from 'components/workbenches/common/WorkbenchBoard'
import { WorkbenchJobTinyFragment } from 'generated/graphql'
import { chunk, isEmpty } from 'lodash'
import { useEffect, useMemo, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { WorkbenchJobCard } from './WorkbenchJobCard'

// one full row of the jobs grid on wide screens
export const BOARD_RECENT_JOBS_COUNT = 4
const NARROW_COLUMNS = 2
// a card's min height; rows are measured once rendered
const ESTIMATED_ROW_HEIGHT = 140

export function WorkbenchJobsBoard({
  jobs,
  loading,
  fetchingMore,
  hasNextPage,
  fetchNextPage,
  recentJobs,
  totalCount,
  emptyState,
}: {
  jobs: WorkbenchJobTinyFragment[]
  // first load only (spinner); later fetches don't blank the view
  loading: boolean
  // a page or poll in flight, to pace loading more
  fetchingMore: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  // the most recent jobs, whatever the sort; none while searching, where
  // "recent" means nothing for search results
  recentJobs?: WorkbenchJobTinyFragment[]
  // jobs matching the current filters, across all pages
  totalCount?: Nullable<number>
  emptyState: EmptyListState
}) {
  // state rather than a ref: the grid's layout effects run before this ref
  // attaches, so it needs a re-render to see the scroll container
  const [boardEl, setBoardEl] = useState<HTMLDivElement | null>(null)

  // the recent jobs are shown above, so they're left out of the jobs below
  const otherJobs = useMemo(() => {
    if (isEmpty(recentJobs)) return jobs
    const recentIds = new Set(recentJobs?.map(({ id }) => id))

    return jobs.filter(({ id }) => !recentIds.has(id))
  }, [jobs, recentJobs])

  if (isEmpty(jobs))
    return (
      <BoardEmptyList
        noun="jobs"
        loading={loading}
        emptyState={emptyState}
      />
    )

  return (
    <BoardSC ref={setBoardEl}>
      {!isEmpty(recentJobs) && (
        <BoardSectionSC>
          <BoardTitleSC>Recent jobs</BoardTitleSC>
          <JobsGridSC>
            {recentJobs?.map((job) => (
              <WorkbenchJobCard
                key={job.id}
                job={job}
              />
            ))}
          </JobsGridSC>
        </BoardSectionSC>
      )}
      {!isEmpty(otherJobs) && (
        <BoardSectionSC>
          <BoardTitle count={totalCount}>
            {recentJobs ? 'All jobs' : 'Matching jobs'}
          </BoardTitle>
          <VirtualJobsGrid
            jobs={otherJobs}
            scrollEl={boardEl}
          />
        </BoardSectionSC>
      )}
      <LoadMoreSentinel
        fetchingMore={fetchingMore}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
      />
    </BoardSC>
  )
}

// Only the rows in (or near) view are rendered, as the board can hold hundreds
// of loaded jobs.
function VirtualJobsGrid({
  jobs,
  scrollEl,
}: {
  jobs: WorkbenchJobTinyFragment[]
  scrollEl: HTMLDivElement | null
}) {
  const theme = useTheme()
  const columns = useJobsGridColumns()
  const rows = useMemo(() => chunk(jobs, columns), [jobs, columns])
  const listRef = useRef<HTMLDivElement>(null)
  const scrollMargin = useScrollMargin(listRef, scrollEl)

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    gap: theme.spacing.medium,
    overscan: 3,
    scrollMargin,
  })
  const items = virtualizer.getVirtualItems()

  return (
    <div
      ref={listRef}
      css={{ position: 'relative', height: virtualizer.getTotalSize() }}
    >
      <VirtualRowsSC
        style={{
          transform: `translateY(${(items[0]?.start ?? 0) - scrollMargin}px)`,
        }}
      >
        {items.map((item) => (
          <JobsRowSC
            key={item.key}
            ref={virtualizer.measureElement}
            data-index={item.index}
            $columns={columns}
          >
            {rows[item.index]?.map((job) => (
              <WorkbenchJobCard
                key={job.id}
                job={job}
              />
            ))}
          </JobsRowSC>
        ))}
      </VirtualRowsSC>
    </div>
  )
}

// matches the CSS breakpoint of the recent jobs grid, so the columns line up
function useJobsGridColumns() {
  const theme = useTheme()
  const query = `(max-width: ${theme.breakpoints.desktop}px)`
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setNarrow(media.matches)

    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])

  return narrow ? NARROW_COLUMNS : BOARD_RECENT_JOBS_COUNT
}

// shared by the recent and all jobs sections, so their columns line up: 4 on
// wide screens, 2 below the desktop breakpoint (recent jobs then show as 2x2)
const JobsGridSC = styled(BoardCardGridSC)(({ theme }) => ({
  gridTemplateColumns: `repeat(${BOARD_RECENT_JOBS_COUNT}, minmax(0, 1fr))`,
  [`@media (max-width: ${theme.breakpoints.desktop}px)`]: {
    gridTemplateColumns: `repeat(${NARROW_COLUMNS}, minmax(0, 1fr))`,
  },
}))

const VirtualRowsSC = styled.div(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
}))

const JobsRowSC = styled.div<{ $columns: number }>(({ theme, $columns }) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${$columns}, minmax(0, 1fr))`,
  gap: theme.spacing.medium,
}))
