import { Chip } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ServiceDeploymentsRowFragment } from '../../../../generated/graphql.ts'
import { Edge } from '../../../../utils/graphql.ts'
import DecoratedName from '../../services/DecoratedName.tsx'
import {
  ColCluster,
  ColLastActivity,
  ColRef,
  ColRepo,
  ColErrors,
  ColStatus,
} from '../../services/ServicesColumns.tsx'

const columnHelper = createColumnHelper<Edge<ServiceDeploymentsRowFragment>>()

const ColDeployment = columnHelper.accessor(({ node }) => node, {
  id: 'deployment',
  header: 'Deployment',
  cell: function Cell({ getValue, table }) {
    const serviceDeployment = getValue()
    const id = table.options.meta?.seedServiceID

    return (
      serviceDeployment && (
        <DecoratedName deletedAt={serviceDeployment.deletedAt}>
          {serviceDeployment.name}
          {serviceDeployment.id === id && (
            <Chip size="small">Seed service</Chip>
          )}
        </DecoratedName>
      )
    )
  },
})

export const columns = [
  ColDeployment,
  ColCluster,
  ColRepo,
  ColRef,
  ColLastActivity,
  ColStatus,
  ColErrors,
]
