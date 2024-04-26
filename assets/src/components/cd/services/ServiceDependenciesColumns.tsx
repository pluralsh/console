import { ServiceDependency, ServiceDeploymentStatus } from 'generated/graphql'
import { createColumnHelper } from '@tanstack/react-table'
import { Chip } from '@pluralsh/design-system'

const columnHelper = createColumnHelper<Nullable<ServiceDependency>>()

const ColName = columnHelper.accessor('name', {
  id: 'name',
  header: 'Name',
})

const ColStatus = columnHelper.accessor('status', {
  id: 'status',
  header: 'Status',
  cell: ({ getValue }) => (
    <Chip
      size="large"
      severity={
        getValue() === ServiceDeploymentStatus.Healthy ? 'success' : 'warning'
      }
    >
      {getValue()}
    </Chip>
  ),
})

export const columns = [ColName, ColStatus]
