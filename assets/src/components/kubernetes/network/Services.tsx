import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { KubernetesClusterFragment } from '../../../generated/graphql'

import {
  Maybe,
  Service_Service as ServiceT,
  Service_ServiceList as ServiceListT,
  ServicesDocument,
  ServicesQuery,
  ServicesQueryVariables,
} from '../../../generated/graphql-kubernetes'
import {
  getNetworkAbsPath,
  SERVICES_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'

import { useCluster } from '../Cluster'
import { ResourceList } from '../common/ResourceList'
import { useDefaultColumns } from '../common/utils'
import { getNetworkBreadcrumbs } from './Network'

import { serviceTypeDisplayName, TableEndpoints } from './utils'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getNetworkBreadcrumbs(cluster),
  {
    label: 'services',
    url: `${getNetworkAbsPath(cluster?.id)}/${SERVICES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<ServiceT>()

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
  (service) => service?.internalEndpoint,
  {
    id: 'internalEndpoints',
    header: 'Internal endpoints',
    cell: ({ getValue }) => <TableEndpoints endpoints={[getValue()]} />,
  }
)

const colExternalEndpoints = columnHelper.accessor(
  (service) => service?.externalEndpoints,
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
  const columns = useServicesColumns()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  return (
    <ResourceList<ServiceListT, ServiceT, ServicesQuery, ServicesQueryVariables>
      namespaced
      columns={columns}
      queryDocument={ServicesDocument}
      queryName="handleGetServiceList"
      itemsKey="services"
    />
  )
}
