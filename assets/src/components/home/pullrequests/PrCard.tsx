import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import { usePullRequestsQuery } from 'generated/graphql'
import { GqlError } from 'components/utils/Alert'

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
    { queryHook: usePullRequestsQuery, keyPath: ['pullRequests'] },
    { open: true }
  )

  if (error) {
    return <GqlError error={error} />
  }

  const numPrs = data?.pullRequests?.edges?.length ?? '-'
  const headerText =
    numPrs === 1 ? `1 PR needs action` : `${numPrs} PRs need action`

  return (
    <div>
      <Title2H1>{headerText}</Title2H1>
      <PrTable
        data={data?.pullRequests?.edges}
        emptyStateProps={{ message: 'No open PRs' }}
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
