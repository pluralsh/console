import { useFluxHelmRepositoriesQuery } from 'generated/graphql'

import { ComponentProps, useEffect, useMemo } from 'react'

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
import { isEmpty } from 'lodash'

export function FluxHelmRepositoriesTable({
  setStatusCounts,
  tableFilterOptions,
}: {
  setStatusCounts: (counts: Record<RepoStatusFilterKey, number>) => void
  tableFilterOptions: ComponentProps<typeof Table>['reactTableOptions']
}) {
  const hasFilters =
    !!tableFilterOptions?.state?.globalFilter ||
    !isEmpty(tableFilterOptions?.state?.columnFilters)
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

  if (error) return <GqlError error={error} />

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      loading={!data && loading}
      data={repos}
      columns={fluxHelmRepoColumns}
      reactTableOptions={tableFilterOptions}
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
