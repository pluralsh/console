import {
  BoardCardGridSC,
  BoardLoadingOrEmpty,
  BoardSC,
  BoardSectionSC,
  BoardTitleSC,
  LoadMoreSentinel,
  useBoardLoadMore,
} from 'components/workbenches/common/WorkbenchBoard'
import { WorkbenchJobTinyFragment } from 'generated/graphql'
import { isEmpty } from 'lodash'
import styled from 'styled-components'
import { WorkbenchJobCard } from './WorkbenchJobCard'

const RECENT_JOBS_COUNT = 4

export function WorkbenchJobsBoard({
  jobs,
  loading,
  fetchingMore,
  hasNextPage,
  fetchNextPage,
  showRecent = true,
}: {
  jobs: WorkbenchJobTinyFragment[]
  // first load only (spinner); later fetches don't blank the view
  loading: boolean
  // a page or poll in flight, to pace loading more
  fetchingMore: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  // off while searching: "recent" means nothing for search results
  showRecent?: boolean
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
      {showRecent && (
        <BoardSectionSC>
          <BoardTitleSC>Recent jobs</BoardTitleSC>
          <RecentGridSC>
            {jobs.slice(0, RECENT_JOBS_COUNT).map((job) => (
              <WorkbenchJobCard
                key={job.id}
                job={job}
              />
            ))}
          </RecentGridSC>
        </BoardSectionSC>
      )}
      <BoardSectionSC>
        <BoardTitleSC>{showRecent ? 'All jobs' : 'Matching jobs'}</BoardTitleSC>
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
  gridTemplateColumns: `repeat(${RECENT_JOBS_COUNT}, minmax(0, 1fr))`,
  [`@media (max-width: ${theme.breakpoints.desktop}px)`]: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
}))
