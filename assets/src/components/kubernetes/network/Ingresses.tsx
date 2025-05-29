import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { isEmpty } from 'lodash'
import { useMemo } from 'react'

import { KubernetesClusterFragment } from '../../../generated/graphql'

import {
  Ingress_Ingress as IngressT,
  Ingress_IngressList as IngressListT,
  IngressesDocument,
  IngressesQuery,
  IngressesQueryVariables,
  Maybe,
} from '../../../generated/graphql-kubernetes'
import {
  getNetworkAbsPath,
  INGRESSES_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import { TableText } from '../../cluster/TableElements'

import { useCluster } from '../Cluster'
import { ResourceList } from '../common/ResourceList'
import { useDefaultColumns } from '../common/utils'
import { getNetworkBreadcrumbs } from './Network'

import { TableEndpoints } from './utils'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getNetworkBreadcrumbs(cluster),
  {
    label: 'ingresses',
    url: `${getNetworkAbsPath(cluster?.id)}/${INGRESSES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<IngressT>()

const colEndpoints = columnHelper.accessor((ingress) => ingress?.endpoints, {
  id: 'endpoints',
  header: 'Endpoints',
  cell: ({ getValue }) => <TableEndpoints endpoints={getValue()} />,
})

const colHosts = columnHelper.accessor((ingress) => ingress?.hosts, {
  id: 'hosts',
  header: 'Hosts',
  cell: ({ getValue }) => {
    const hosts = getValue()

    return isEmpty(hosts)
      ? '-'
      : hosts.map((host) => <TableText>{host}</TableText>)
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

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const columns = useIngressesColumns()

  return (
    <ResourceList<
      IngressListT,
      IngressT,
      IngressesQuery,
      IngressesQueryVariables
    >
      namespaced
      columns={columns}
      queryDocument={IngressesDocument}
      queryName="handleGetIngressList"
      itemsKey="items"
    />
  )
}
