import { Table } from '@pluralsh/design-system'
import {
  GitHealth,
  useHelmPullabilityStatisticsQuery,
  useHelmRepositoriesQuery,
} from 'generated/graphql'
import { useEffect } from 'react'

import { POLL_INTERVAL } from 'components/cluster/constants'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  ColCreatedAt,
  ColProvider,
  ColPulledAt,
  ColRepo,
  ColStatus,
  ColUpdatedAt,
} from './GitRepositoriesColumns'
import {
  countsFromGitOrHelmRepos,
  RepoStatusFilterKey,
} from './RepositoriesFilters'

export function HelmRepositoriesTable({
  status,
  searchStr,
  setStatusCounts,
}: {
  status: RepoStatusFilterKey
  searchStr: string
  setStatusCounts: (counts: Record<RepoStatusFilterKey, number>) => void
}) {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useHelmRepositoriesQuery, keyPath: ['helmRepositories'] },
      { q: searchStr, health: statusFilterKeyToGitHealth(status) }
    )
  const { data: statsData } = useHelmPullabilityStatisticsQuery({
    pollInterval: POLL_INTERVAL,
  })

  const hasFilters = !!status || !!searchStr

  useEffect(() => {
    setStatusCounts(
      countsFromGitOrHelmRepos(statsData?.helmPullabilityStatistics)
    )
  }, [setStatusCounts, statsData?.helmPullabilityStatistics])

  if (error) return <GqlError error={error} />

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      loading={!data && loading}
      data={data?.helmRepositories?.edges ?? []}
      columns={helmRepoColumns}
      emptyStateProps={{
        message: hasFilters
          ? 'No results found. Try adjusting your filters.'
          : "Looks like you don't have any Helm repositories yet.",
      }}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
    />
  )
}

export function statusFilterKeyToGitHealth(
  status: RepoStatusFilterKey
): GitHealth | undefined {
  switch (status) {
    case RepoStatusFilterKey.Pullable:
      return GitHealth.Pullable
    case RepoStatusFilterKey.Failed:
      return GitHealth.Failed
  }
  return undefined
}

const helmRepoColumns = [
  ColRepo,
  ColProvider,
  ColStatus,
  ColCreatedAt,
  ColPulledAt,
  ColUpdatedAt,
]
