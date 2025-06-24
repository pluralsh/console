import { Chip, EmptyState, Table } from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'

import { createColumnHelper } from '@tanstack/react-table'
import {
  ServiceDependencyFragment,
  ServiceDeploymentStatus,
} from 'generated/graphql'
import { capitalize } from 'lodash'
import { isNonNullable } from 'utils/isNonNullable'
import { useServiceContext } from './ServiceDetails'

const columnHelper = createColumnHelper<ServiceDependencyFragment>()

export function ServiceDependencies() {
  const { service } = useServiceContext()

  if (isEmpty(service.dependencies))
    return <EmptyState message="No dependencies found." />

  return (
    <Table
      fullHeightWrap
      data={service?.dependencies?.filter(isNonNullable) ?? []}
      columns={columns}
    />
  )
}

const columns = [
  columnHelper.accessor('name', {
    id: 'name',
    header: 'Name',
  }),
  columnHelper.accessor('status', {
    id: 'status',
    header: 'Status',
    cell: ({ getValue }) => (
      <Chip
        size="large"
        severity={
          getValue() === ServiceDeploymentStatus.Healthy ? 'success' : 'warning'
        }
      >
        {capitalize(getValue() ?? '')}
      </Chip>
    ),
  }),
]
