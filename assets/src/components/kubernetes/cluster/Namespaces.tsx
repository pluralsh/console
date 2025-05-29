import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { KubernetesClusterFragment } from '../../../generated/graphql'

import {
  Maybe,
  Namespace_Namespace as NamespaceT,
  Namespace_NamespaceList as NamespaceListT,
  NamespacesDocument,
  NamespacesQuery,
  NamespacesQueryVariables,
} from '../../../generated/graphql-kubernetes'
import {
  getClusterAbsPath,
  NAMESPACES_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'

import { useCluster } from '../Cluster'
import { ResourceList } from '../common/ResourceList'
import { useDefaultColumns } from '../common/utils'
import { getClusterBreadcrumbs } from './Cluster'

import { NamespacePhaseChip } from './utils'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
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

  const { colAction, colName, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colPhase, colLabels, colCreationTimestamp, colAction],
    [colName, colLabels, colCreationTimestamp, colAction]
  )

  return (
    <ResourceList<
      NamespaceListT,
      NamespaceT,
      NamespacesQuery,
      NamespacesQueryVariables
    >
      columns={columns}
      queryDocument={NamespacesDocument}
      queryName="handleGetNamespaces"
      itemsKey="namespaces"
    />
  )
}
