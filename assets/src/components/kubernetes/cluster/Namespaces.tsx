import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { KubernetesClusterFragment } from '../../../generated/graphql'

import {
  Maybe,
  Namespace_Namespace as NamespaceT,
} from '../../../generated/graphql-kubernetes'
import {
  getClusterAbsPath,
  NAMESPACES_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'

import { useCluster } from '../Cluster'
import { useDefaultColumns } from '../common/utils'
import { getClusterBreadcrumbs } from './Cluster'

import { NamespacePhaseChip } from './utils'
import { UpdatedResourceList } from '../common/UpdatedResourceList.tsx'
import {
  NamespaceNamespace,
  NamespaceNamespaceList,
} from '../../../generated/kubernetes'
import { getNamespacesInfiniteOptions } from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getClusterBreadcrumbs(cluster),
  {
    label: 'namespaces',
    url: `${getClusterAbsPath(cluster?.id)}/${NAMESPACES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<NamespaceNamespace>()

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
    <UpdatedResourceList<NamespaceNamespaceList, NamespaceNamespace>
      columns={columns}
      queryOptions={getNamespacesInfiniteOptions}
      itemsKey="namespaces"
    />
  )
}
