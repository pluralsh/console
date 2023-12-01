import { Table } from '@pluralsh/design-system'
import { GitRepositoriesQuery } from 'generated/graphql'
import { Key, useMemo } from 'react'

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
  ColActions,
]
export function GitRepositoriesTable({
  data,
  refetch,
  filterString,
  statusFilterKey,
}: {
  data: GitRepositoriesQuery
  filterString: string
  statusFilterKey: Key
  refetch: () => void
}) {
  const reactTableOptions = useMemo(
    () => ({
      state: {
        globalFilter: filterString,
        columnFilters: [
          ...(statusFilterKey !== 'ALL'
            ? [
                {
                  id: 'status',
                  value: statusFilterKey,
                },
              ]
            : []),
        ],
      },
      meta: { refetch },
    }),
    [filterString, refetch, statusFilterKey]
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
