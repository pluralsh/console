import { EmptyState, Flex, Spinner } from '@pluralsh/design-system'
import {
  BoardSC,
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
  hasNextPage,
  fetchNextPage,
}: {
  jobs: WorkbenchJobTinyFragment[]
  loading: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
}) {
  const loadMore = useBoardLoadMore({ loading, hasNextPage, fetchNextPage })

  if (isEmpty(jobs)) {
    return loading ? (
      <LoadingSC>
        <Spinner />
      </LoadingSC>
    ) : (
      <EmptyState message="No jobs found." />
    )
  }

  return (
    <BoardSC>
      <SectionSC>
        <BoardTitleSC>Recent jobs</BoardTitleSC>
        <RecentGridSC>
          {jobs.slice(0, RECENT_JOBS_COUNT).map((job) => (
            <WorkbenchJobCard
              key={job.id}
              job={job}
            />
          ))}
        </RecentGridSC>
      </SectionSC>
      <SectionSC>
        <BoardTitleSC>All jobs</BoardTitleSC>
        <WorkbenchJobCardGridSC>
          {jobs.map((job) => (
            <WorkbenchJobCard
              key={job.id}
              job={job}
            />
          ))}
        </WorkbenchJobCardGridSC>
      </SectionSC>
      {hasNextPage && <LoadMoreSentinel onVisible={loadMore} />}
    </BoardSC>
  )
}

const SectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  paddingBottom: theme.spacing.large,
}))

const RecentGridSC = styled(WorkbenchJobCardGridSC)(({ theme }) => ({
  [`@media (max-width: ${theme.breakpoints.desktop}px)`]: {
    '& > :nth-child(n + 3)': { display: 'none' },
  },
}))

const LoadingSC = styled(Flex)({
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
})
