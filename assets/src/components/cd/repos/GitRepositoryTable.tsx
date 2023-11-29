import { Table } from '@pluralsh/design-system'
import { GitRepositoriesQuery } from 'generated/graphql'
import { useMemo } from 'react'

import {
  ColActions,
  ColAuthMethod,
  ColCreatedAt,
  ColPulledAt,
  ColRepo,
  ColStatus,
  ColUpdatedAt,
} from './GitRepositoriesColumns'

export const gitRepoColumns = [
  ColRepo,
  ColAuthMethod,
  ColStatus,
  ColCreatedAt,
  ColUpdatedAt,
  ColPulledAt,
  // ColOwner,
  ColActions,
]
export function GitRepositoryTable({
  data,
  refetch,
  filters,
}: {
  data: GitRepositoriesQuery
  filters: Record<string, any>
  refetch: () => void
}) {
  const reactTableOptions = useMemo(
    () => ({
      state: {
        ...filters,
      },
      meta: { refetch },
    }),
    [refetch, filters]
  )

  return (
    <Table
      data={data?.gitRepositories?.edges || []}
      columns={gitRepoColumns}
      css={{
        maxHeight: 'unset',
        height: '100%',
      }}
      reactTableOptions={reactTableOptions}
    />
  )
}
