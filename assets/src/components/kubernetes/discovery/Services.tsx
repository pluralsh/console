import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  Maybe,
  Service_ServiceList as ServiceListT,
  Service_Service as ServiceT,
  ServicesQuery,
  ServicesQueryVariables,
  useServicesQuery,
} from '../../../generated/graphql-kubernetes'
import { getBaseBreadcrumbs, useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'

import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  SERVICES_REL_PATH,
  getDiscoveryAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { useKubernetesContext } from '../Kubernetes'

import { Endpoints, serviceTypeDisplayName } from './utils'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'discovery',
    url: getDiscoveryAbsPath(cluster?.id),
  },
  {
    label: 'services',
    url: `${getDiscoveryAbsPath(cluster?.id)}/${SERVICES_REL_PATH}`,
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
    cell: ({ getValue }) => <Endpoints endpoints={[getValue()]} />,
  }
)

const colExternalEndpoints = columnHelper.accessor(
  (service) => service?.externalEndpoints,
  {
    id: 'externalEndpoints',
    header: 'External endpoints',
    cell: ({ getValue }) => <Endpoints endpoints={getValue()} />,
  }
)

export default function Services() {
  const { cluster } = useKubernetesContext()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [
      colName,
      colNamespace,
      colType,
      colClusterIp,
      colInternalEndpoints,
      colExternalEndpoints,
      colLabels,
      colCreationTimestamp,
    ],
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
