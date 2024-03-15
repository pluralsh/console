import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import {
  Namespace_NamespaceList as NamespaceListT,
  Namespace_Namespace as NamespaceT,
  NamespacesQuery,
  NamespacesQueryVariables,
  useNamespacesQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'

import { NamespacePhaseChip } from './utils'

const columnHelper = createColumnHelper<NamespaceT>()

const colPhase = columnHelper.accessor((namespace) => namespace?.phase, {
  id: 'phase',
  header: 'Phase',
  cell: ({ getValue }) => <NamespacePhaseChip phase={getValue()} />,
})

export default function Namespaces() {
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
