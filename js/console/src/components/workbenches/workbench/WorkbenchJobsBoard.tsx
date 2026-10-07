import {
  BoardCardGridSC,
  BoardLoadingOrEmpty,
  BoardSC,
  BoardSectionSC,
  BoardTitle,
  BoardTitleSC,
  LoadMoreSentinel,
  useBoardLoadMore,
} from 'components/workbenches/common/WorkbenchBoard'
import { WorkbenchJobTinyFragment } from 'generated/graphql'
import { isEmpty } from 'lodash'
import styled from 'styled-components'
import { WorkbenchJobCard } from './WorkbenchJobCard'

export const BOARD_RECENT_JOBS_COUNT = 4

export function WorkbenchJobsBoard({
  jobs,
  loading,
  fetchingMore,
  hasNextPage,
  fetchNextPage,
  recentJobs,
  totalCount,
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
}) {
  const loadMore = useBoardLoadMore({
    fetchingMore,
    hasNextPage,
    fetchNextPage,
  })

  if (isEmpty(jobs))
    return (
      <BoardLoadingOrEmpty
        loading={loading}
        message="No jobs found."
      />
    )

  return (
    <BoardSC>
      {!isEmpty(recentJobs) && (
        <BoardSectionSC>
          <BoardTitleSC>Recent jobs</BoardTitleSC>
          <RecentGridSC>
            {recentJobs?.map((job) => (
              <WorkbenchJobCard
                key={job.id}
                job={job}
              />
            ))}
          </RecentGridSC>
        </BoardSectionSC>
      )}
      <BoardSectionSC>
        <BoardTitle count={totalCount}>
          {recentJobs ? 'All jobs' : 'Matching jobs'}
        </BoardTitle>
        <BoardCardGridSC>
          {jobs.map((job) => (
            <WorkbenchJobCard
              key={job.id}
              job={job}
            />
          ))}
        </BoardCardGridSC>
      </BoardSectionSC>
      {hasNextPage && <LoadMoreSentinel onVisible={loadMore} />}
    </BoardSC>
  )
}

// one row of 4 on wide screens, 2x2 below the desktop breakpoint
const RecentGridSC = styled(BoardCardGridSC)(({ theme }) => ({
  gridTemplateColumns: `repeat(${BOARD_RECENT_JOBS_COUNT}, minmax(0, 1fr))`,
  [`@media (max-width: ${theme.breakpoints.desktop}px)`]: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
}))
