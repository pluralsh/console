import {
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
import { WorkbenchJobCard, WorkbenchJobCardGridSC } from './WorkbenchJobCard'

// One full row of the card grid (3 columns, 2 below the desktop breakpoint).
const RECENT_JOBS_COUNT = 3

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
        <WorkbenchJobCardGridSC>
          {jobs.map((job) => (
            <WorkbenchJobCard
              key={job.id}
              job={job}
            />
          ))}
        </WorkbenchJobCardGridSC>
      </BoardSectionSC>
      {hasNextPage && <LoadMoreSentinel onVisible={loadMore} />}
    </BoardSC>
  )
}

const RecentGridSC = styled(WorkbenchJobCardGridSC)(({ theme }) => ({
  [`@media (max-width: ${theme.breakpoints.desktop}px)`]: {
    '& > :nth-child(n + 3)': { display: 'none' },
  },
}))
