import { Table } from '@pluralsh/design-system'
import {
  useHelmPullabilityStatisticsQuery,
  useHelmRepositoriesQuery,
} from 'generated/graphql'
import { ComponentProps, useEffect } from 'react'

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
import { isEmpty } from 'lodash'

export function HelmRepositoriesTable({
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
      queryHook: useHelmRepositoriesQuery,
      keyPath: ['helmRepositories'],
    })
  const { data: statsData } = useHelmPullabilityStatisticsQuery({
    pollInterval: POLL_INTERVAL,
  })

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
      reactTableOptions={tableFilterOptions}
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

const helmRepoColumns = [
  ColRepo,
  ColProvider,
  ColStatus,
  ColCreatedAt,
  ColPulledAt,
  ColUpdatedAt,
]
