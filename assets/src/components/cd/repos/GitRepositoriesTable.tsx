import { EmptyState, Table } from '@pluralsh/design-system'
import { GitRepositoriesQuery } from 'generated/graphql'
import { ComponentProps } from 'react'

import { isEmpty } from 'lodash'

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
  reactTableOptions,
}: {
  data: GitRepositoriesQuery
  reactTableOptions?: ComponentProps<typeof Table>['reactTableOptions']
}) {
  const edges = data?.gitRepositories?.edges

  return !isEmpty(edges) ? (
    <Table
      data={edges || []}
      columns={gitRepoColumns}
      css={{
        maxHeight: 'unset',
        height: '100%',
      }}
      reactTableOptions={reactTableOptions}
    />
  ) : (
    <EmptyState message="Looks like you don't have any Git repositories yet." />
  )
}
