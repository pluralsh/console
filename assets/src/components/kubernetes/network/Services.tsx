import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { KubernetesClusterFragment } from '../../../generated/graphql'
import {
  ServiceService,
  ServiceServiceList,
} from '../../../generated/kubernetes'
import {
  getAllServicesInfiniteOptions,
  getServicesInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen'
import {
  getNetworkAbsPath,
  SERVICES_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'

import { useCluster } from '../Cluster'
import { useDataSelect } from '../common/DataSelect'
import { UpdatedResourceList } from '../common/UpdatedResourceList'
import { useDefaultColumns } from '../common/utils'
import { getNetworkBreadcrumbs } from './Network'

import { serviceTypeDisplayName, TableEndpoints } from './utils'

export const getBreadcrumbs = (
  cluster?: KubernetesClusterFragment | null | undefined
) => [
  ...getNetworkBreadcrumbs(cluster),
  {
    label: 'services',
    url: `${getNetworkAbsPath(cluster?.id)}/${SERVICES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<ServiceService>()

const colType = columnHelper.accessor((service) => service.type, {
  id: 'type',
  header: 'Type',
  cell: ({ getValue }) =>
    serviceTypeDisplayName[getValue().toLowerCase()] ?? getValue(),
})

const colClusterIp = columnHelper.accessor((service) => service.clusterIP, {
  id: 'clusterIp',
  header: 'Cluster IP',
  cell: ({ getValue }) => getValue(),
})

const colInternalEndpoints = columnHelper.accessor(
  (service) => service.internalEndpoint,
  {
    id: 'internalEndpoints',
    header: 'Internal endpoints',
    cell: ({ getValue }) => <TableEndpoints endpoints={[getValue()]} />,
  }
)

const colExternalEndpoints = columnHelper.accessor(
  (service) => service.externalEndpoints,
  {
    id: 'externalEndpoints',
    header: 'External endpoints',
    cell: ({ getValue }) => <TableEndpoints endpoints={getValue()} />,
  }
)

export function useServicesColumns(): Array<object> {
  const { colAction, colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)

  return useMemo(
    () => [
      colName,
      colNamespace,
      colType,
      colClusterIp,
      colInternalEndpoints,
      colExternalEndpoints,
      colLabels,
      colCreationTimestamp,
      colAction,
    ],
    [colName, colNamespace, colLabels, colCreationTimestamp, colAction]
  )
}

export default function Services() {
  const cluster = useCluster()
  const { hasNamespaceFilterActive } = useDataSelect()
  const columns = useServicesColumns()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  return (
    <UpdatedResourceList<ServiceServiceList, ServiceService>
      namespaced
      columns={columns}
      queryOptions={
        hasNamespaceFilterActive
          ? getServicesInfiniteOptions
          : getAllServicesInfiniteOptions
      }
      itemsKey="services"
    />
  )
}
