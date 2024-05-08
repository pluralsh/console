import { useFetchPaginatedData } from 'components/cd/utils/useFetchPaginatedData'

import { usePullRequestsQuery } from 'generated/graphql'
import { PR_QUERY_PAGE_SIZE } from 'components/pr/queue/PrQueue'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { Title2H1 } from '../../utils/typography/Text'

import { PrTable } from './PrTable'

export function PrCard() {
  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    {
      queryHook: usePullRequestsQuery,
      pageSize: PR_QUERY_PAGE_SIZE,
      queryKey: 'pullRequests',
    },
    {
      open: true,
    }
  )

  if (error) {
    return <GqlError error={error} />
  }
  if (!data?.pullRequests?.edges) {
    return <LoadingIndicator />
  }

  const numPrs = data.pullRequests.edges.length
  const headerText =
    numPrs === 1 ? `1 PR needs action` : `${numPrs} PRs need action`

  return (
    <div>
      <Title2H1>{headerText}</Title2H1>
      <PrTable
        data={data.pullRequests.edges}
        emptyStateProps={{ message: 'All services healthy!' }}
        refetch={refetch}
        virtualizeRows
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        css={{ maxHeight: '350px' }}
      />
    </div>
  )
}
