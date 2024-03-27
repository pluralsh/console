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
import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'
import { TableText } from '../../cluster/TableElements'

import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  INGRESSES_REL_PATH,
  getDiscoveryAbsPath,
  getKubernetesAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { useKubernetesContext } from '../Kubernetes'

import { Endpoints } from './utils'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  {
    label: 'kubernetes',
    url: getKubernetesAbsPath(cluster?.id),
  },
  {
    label: cluster?.name ?? '',
    url: getKubernetesAbsPath(cluster?.id),
  },
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
  cell: ({ getValue }) => <Endpoints endpoints={getValue()} />,
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

export default function Ingresses() {
  const { cluster } = useKubernetesContext()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
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
