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

const columnHelper = createColumnHelper<NamespaceT>()

export default function Namespaces() {
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<
      NamespaceListT,
      NamespaceT,
      NamespacesQuery,
      NamespacesQueryVariables
    >
      namespaced
      columns={columns}
      query={useNamespacesQuery}
      queryName="handleGetNamespaces"
      itemsKey="namespaces"
    />
  )
}
