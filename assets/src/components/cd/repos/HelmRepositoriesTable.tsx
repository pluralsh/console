import { EmptyState, Table } from '@pluralsh/design-system'
import { HelmRepositoriesQuery } from 'generated/graphql'
import { ComponentProps } from 'react'

import { isEmpty } from 'lodash'

import {
  ColCreatedAt,
  ColProvider,
  ColPulledAt,
  ColRepo,
  ColStatus,
  ColUpdatedAt,
} from './GitRepositoriesColumns'

export function HelmRepositoriesTable({
  data,
  reactTableOptions,
}: {
  data: HelmRepositoriesQuery
  reactTableOptions?: ComponentProps<typeof Table>['reactTableOptions']
}) {
  const edges = data?.helmRepositories?.edges

  return !isEmpty(edges) ? (
    <Table
      data={edges || []}
      columns={helmRepoColumns}
      reactTableOptions={reactTableOptions}
    />
  ) : (
    <EmptyState message="Looks like you don't have any Helm repositories yet." />
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
