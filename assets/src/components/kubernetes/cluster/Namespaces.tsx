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
import { getBaseBreadcrumbs, useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'

import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  NAMESPACES_REL_PATH,
  getClusterAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { useKubernetesContext } from '../Kubernetes'

import { NamespacePhaseChip } from './utils'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'cluster',
    url: getClusterAbsPath(cluster?.id),
  },
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
  const { cluster } = useKubernetesContext()

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
