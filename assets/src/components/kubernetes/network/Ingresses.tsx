import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { isEmpty } from 'lodash'
import { useMemo } from 'react'

import { KubernetesClusterFragment } from '../../../generated/graphql'
import {
  IngressIngress,
  IngressIngressList,
} from '../../../generated/kubernetes'
import {
  getAllIngressesInfiniteOptions,
  getIngressesInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen'
import {
  INGRESSES_REL_PATH,
  getNetworkAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { TableText } from '../../cluster/TableElements'

import { useCluster } from '../Cluster'
import { useDataSelect } from '../common/DataSelect'
import { ResourceList } from '../common/ResourceList'
import { useDefaultColumns } from '../common/utils'
import { getNetworkBreadcrumbs } from './Network'

import { TableEndpoints } from './utils'

export const getBreadcrumbs = (
  cluster?: KubernetesClusterFragment | null | undefined
) => [
  ...getNetworkBreadcrumbs(cluster),
  {
    label: 'ingresses',
    url: `${getNetworkAbsPath(cluster?.id)}/${INGRESSES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<IngressIngress>()

const colEndpoints = columnHelper.accessor((ingress) => ingress.endpoints, {
  id: 'endpoints',
  header: 'Endpoints',
  cell: ({ getValue }) => <TableEndpoints endpoints={getValue()} />,
})

const colHosts = columnHelper.accessor((ingress) => ingress.hosts, {
  id: 'hosts',
  header: 'Hosts',
  cell: ({ getValue }) => {
    const hosts = getValue()

    return isEmpty(hosts)
      ? '-'
      : hosts.map((host) => <TableText key={host}>{host}</TableText>)
  },
})

export function useIngressesColumns(): Array<object> {
  const { colAction, colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)

  return useMemo(
    () => [
      colName,
      colNamespace,
      colEndpoints,
      colHosts,
      colLabels,
      colCreationTimestamp,
      colAction,
    ],
    [colName, colNamespace, colLabels, colCreationTimestamp, colAction]
  )
}

export default function Ingresses() {
  const cluster = useCluster()
  const { hasNamespaceFilterActive } = useDataSelect()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const columns = useIngressesColumns()

  return (
    <ResourceList<IngressIngressList, IngressIngress>
      namespaced
      columns={columns}
      queryOptions={
        hasNamespaceFilterActive
          ? getIngressesInfiniteOptions
          : getAllIngressesInfiniteOptions
      }
      itemsKey="items"
    />
  )
}
