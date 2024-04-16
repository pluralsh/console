import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  Maybe,
  Namespace_NamespaceList as NamespaceListT,
  Namespace_Namespace as NamespaceT,
  NamespacesQuery,
  NamespacesQueryVariables,
  useNamespacesQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../common/utils'
import { ResourceList } from '../common/ResourceList'

import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  NAMESPACES_REL_PATH,
  getClusterAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { useCluster } from '../Cluster'

import { NamespacePhaseChip } from './utils'
import { getClusterBreadcrumbs } from './Cluster'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getClusterBreadcrumbs(cluster),
  {
    label: 'namespaces',
    url: `${getClusterAbsPath(cluster?.id)}/${NAMESPACES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<NamespaceT>()

const colPhase = columnHelper.accessor((namespace) => namespace?.phase, {
  id: 'phase',
  header: 'Phase',
  cell: ({ getValue }) => <NamespacePhaseChip phase={getValue()} />,
})

export default function Namespaces() {
  const cluster = useCluster()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colName, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colPhase, colLabels, colCreationTimestamp],
    [colName, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<
      NamespaceListT,
      NamespaceT,
      NamespacesQuery,
      NamespacesQueryVariables
    >
      columns={columns}
      query={useNamespacesQuery}
      queryName="handleGetNamespaces"
      itemsKey="namespaces"
    />
  )
}
