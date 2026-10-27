import { Table } from '@pluralsh/design-system'
import { useGitPullabilityStatisticsQuery } from 'generated/graphql'
import { GitRepositoriesDocument } from 'generated/graphql-documents'
import { useEffect } from 'react'

import {
  AGGREGATE_POLL_INTERVAL,
  POLL_INTERVAL,
} from 'components/cluster/constants'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  ColActions,
  ColAuthMethod,
  ColCreatedAt,
  ColPulledAt,
  ColRepo,
  ColStatus,
  ColUpdatedAt,
} from './GitRepositoriesColumns'
import { statusFilterKeyToGitHealth } from './HelmRepositoriesTable'
import {
  countsFromGitOrHelmRepos,
  RepoStatusFilterKey,
} from './RepositoriesFilters'

export function GitRepositoriesTable({
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
      {
        pollInterval: POLL_INTERVAL,
        query: GitRepositoriesDocument,
        keyPath: ['gitRepositories'],
      },
      { q: searchStr, health: statusFilterKeyToGitHealth(status) }
    )
  const { data: statsData } = useGitPullabilityStatisticsQuery({
    pollInterval: AGGREGATE_POLL_INTERVAL,
  })

  const hasFilters = !!status || !!searchStr

  useEffect(() => {
    setStatusCounts(
      countsFromGitOrHelmRepos(statsData?.gitPullabilityStatistics)
    )
  }, [setStatusCounts, statsData?.gitPullabilityStatistics])

  if (error) return <GqlError error={error} />

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      loading={!data && loading}
      data={data?.gitRepositories?.edges ?? []}
      columns={gitRepoColumns}
      emptyStateProps={{
        message: hasFilters
          ? 'No results found. Try adjusting your filters.'
          : "Looks like you don't have any Git repositories yet.",
      }}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
    />
  )
}

const gitRepoColumns = [
  ColRepo,
  ColAuthMethod,
  ColStatus,
  ColCreatedAt,
  ColUpdatedAt,
  ColPulledAt,
  ColActions,
]
