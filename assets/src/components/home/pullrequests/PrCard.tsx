import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import { usePullRequestsQuery } from 'generated/graphql'
import { GqlError } from 'components/utils/Alert'

import { OverlineH1 } from '../../utils/typography/Text'

import { PrTable } from './PrTable'
import { useTheme } from 'styled-components'

export function PrCard() {
  const theme = useTheme()
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
    <div
      css={{
        '@media (min-width: 1168px)': {
          width: '50%',
        },
      }}
    >
      <OverlineH1
        css={{
          color: theme.colors['text-xlight'],
          marginBottom: theme.spacing.small,
        }}
      >
        {headerText}
      </OverlineH1>
      <PrTable
        loading={!data && loading}
        loadingSkeletonRows={3}
        data={data?.pullRequests?.edges ?? []}
        emptyStateProps={{ message: 'No open PRs.' }}
        refetch={refetch}
        virtualizeRows
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        maxHeight="350px"
      />
    </div>
  )
}
