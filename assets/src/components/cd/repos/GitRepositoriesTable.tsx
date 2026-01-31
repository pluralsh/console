import { Table } from '@pluralsh/design-system'
import {
  useGitPullabilityStatisticsQuery,
  useGitRepositoriesQuery,
} from 'generated/graphql'
import { ComponentProps, useEffect } from 'react'

import { POLL_INTERVAL } from 'components/cluster/constants'
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
import {
  countsFromGitOrHelmRepos,
  RepoStatusFilterKey,
} from './RepositoriesFilters'
import { isEmpty } from 'lodash'

export function GitRepositoriesTable({
  tableFilterOptions,
  setStatusCounts,
}: {
  tableFilterOptions: ComponentProps<typeof Table>['reactTableOptions']
  setStatusCounts: (counts: Record<RepoStatusFilterKey, number>) => void
}) {
  const hasFilters =
    !!tableFilterOptions?.state?.globalFilter ||
    !isEmpty(tableFilterOptions?.state?.columnFilters)
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      queryHook: useGitRepositoriesQuery,
      keyPath: ['gitRepositories'],
    })
  const { data: statsData } = useGitPullabilityStatisticsQuery({
    pollInterval: POLL_INTERVAL,
  })

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
      reactTableOptions={tableFilterOptions}
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
