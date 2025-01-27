import { FluxHelmRepositoriesQuery } from 'generated/graphql'

import { ComponentProps } from 'react'

import { EmptyState, Table } from '@pluralsh/design-system'

import { isEmpty } from 'lodash'

import {
  ColName,
  ColNamespace,
  ColProvider,
  ColStatus,
  ColType,
  ColUrl,
} from './FluxHelmRepositoriesColumns'

export function FluxHelmRepositoriesTable({
  data,
  reactTableOptions,
}: {
  data: FluxHelmRepositoriesQuery
  reactTableOptions?: ComponentProps<typeof Table>['reactTableOptions']
}) {
  const repos = data?.fluxHelmRepositories

  return !isEmpty(repos) ? (
    <Table
      data={data?.fluxHelmRepositories || []}
      columns={fluxHelmRepoColumns}
      reactTableOptions={reactTableOptions}
    />
  ) : (
    <EmptyState message="Looks like you don't have any Flux repositories yet." />
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
