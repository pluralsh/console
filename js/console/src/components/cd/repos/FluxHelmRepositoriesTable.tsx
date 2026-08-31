import { useFluxHelmRepositoriesQuery } from 'generated/graphql'

import { useEffect, useMemo } from 'react'

import { Table } from '@pluralsh/design-system'

import { POLL_INTERVAL } from 'components/cluster/constants'
import { GqlError } from 'components/utils/Alert'
import { isNonNullable } from 'utils/isNonNullable'
import {
  ColName,
  ColNamespace,
  ColProvider,
  ColStatus,
  ColType,
  ColUrl,
} from './FluxHelmRepositoriesColumns'
import {
  countsFromFluxHelmRepos,
  RepoStatusFilterKey,
} from './RepositoriesFilters'

export function FluxHelmRepositoriesTable({
  status,
  searchStr,
  setStatusCounts,
}: {
  status: Nullable<RepoStatusFilterKey>
  searchStr: Nullable<string>
  setStatusCounts: (counts: Record<RepoStatusFilterKey, number>) => void
}) {
  const hasFilters = !!searchStr || !!status
  const { data, loading, error } = useFluxHelmRepositoriesQuery({
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const repos = useMemo(
    () => data?.fluxHelmRepositories?.filter(isNonNullable) ?? [],
    [data]
  )

  useEffect(() => {
    setStatusCounts(countsFromFluxHelmRepos(repos))
  }, [repos, setStatusCounts])

  const tableOptions = useMemo(
    () => ({
      state: {
        globalFilter: searchStr,
        columnFilters: [
          ...(status !== 'ALL' ? [{ id: 'status', value: status }] : []),
        ],
      },
    }),
    [searchStr, status]
  )

  if (error) return <GqlError error={error} />

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      loading={!data && loading}
      data={repos}
      columns={fluxHelmRepoColumns}
      reactTableOptions={tableOptions}
      emptyStateProps={{
        message: hasFilters
          ? 'No results found. Try adjusting your filters.'
          : "Looks like you don't have any Flux Helm repositories yet.",
      }}
    />
  )
}

const fluxHelmRepoColumns = [
  ColName,
  ColStatus,
  ColNamespace,
  ColProvider,
  ColType,
  ColUrl,
]
