import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import {
  Service_ServiceList as ServiceListT,
  Service_Service as ServiceT,
  ServicesQuery,
  ServicesQueryVariables,
  useServicesQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../utils'

import { ResourceList } from '../ResourceList'

const columnHelper = createColumnHelper<ServiceT>()

export default function Services() {
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<ServiceListT, ServiceT, ServicesQuery, ServicesQueryVariables>
      namespaced
      columns={columns}
      query={useServicesQuery}
      queryName="handleGetServiceList"
      itemsKey="services"
    />
  )
}
