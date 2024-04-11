import { createColumnHelper } from '@tanstack/react-table'
import { isEmpty } from 'lodash'
import { useMemo } from 'react'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  Ingress_IngressList as IngressListT,
  Ingress_Ingress as IngressT,
  IngressesQuery,
  IngressesQueryVariables,
  Maybe,
  useIngressesQuery,
} from '../../../generated/graphql-kubernetes'
import { getBaseBreadcrumbs, useDefaultColumns } from '../common/utils'
import { ResourceList } from '../common/ResourceList'
import { TableText } from '../../cluster/TableElements'

import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  INGRESSES_REL_PATH,
  getDiscoveryAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { useClusterContext } from '../Cluster'

import { TableEndpoints } from './utils'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'discovery',
    url: getDiscoveryAbsPath(cluster?.id),
  },
  {
    label: 'ingresses',
    url: `${getDiscoveryAbsPath(cluster?.id)}/${INGRESSES_REL_PATH}`,
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
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)

  return useMemo(
    () => [
      colName,
      colNamespace,
      colEndpoints,
      colHosts,
      colLabels,
      colCreationTimestamp,
    ],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )
}

export default function Ingresses() {
  const { cluster } = useClusterContext()

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
      query={useIngressesQuery}
      queryName="handleGetIngressList"
      itemsKey="items"
    />
  )
}
