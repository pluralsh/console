import { Table } from '@pluralsh/design-system'
import { ServiceDeploymentsRowFragment } from 'generated/graphql'
import { ComponentProps } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edge } from 'utils/graphql'
import { Row } from '@tanstack/react-table'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'

import {
  ColCluster,
  ColErrors,
  ColServiceDeployment,
  ColStatus,
} from 'components/cd/services/ServicesColumns'

import { DEFAULT_REACT_VIRTUAL_OPTIONS } from '../../utils/table/useFetchPaginatedData'

export function DeploymentsTable({
  refetch,
  data,
  ...props
}: {
  refetch?
  data
} & Omit<ComponentProps<typeof Table>, 'data' | 'columns'>) {
  const navigate = useNavigate()
  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] = {
    meta: { refetch },
  }

  return (
    <Table
      loose
      fillLevel={1}
      data={data}
      columns={deploymentsColumns}
      reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      reactTableOptions={reactTableOptions}
      onRowClick={(
        _e,
        { original }: Row<Edge<ServiceDeploymentsRowFragment>>
      ) =>
        navigate(
          getServiceDetailsPath({
            clusterId: original.node?.cluster?.id,
            serviceId: original.node?.id,
          })
        )
      }
      {...props}
    />
  )
}

const deploymentsColumns = [
  ColServiceDeployment,
  ColCluster,
  ColStatus,
  ColErrors,
]
