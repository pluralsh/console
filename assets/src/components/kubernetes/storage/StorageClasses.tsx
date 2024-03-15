import { createColumnHelper } from '@tanstack/react-table'

import { useMemo } from 'react'

import {
  Storageclass_StorageClassList as StorageClassListT,
  Storageclass_StorageClass as StorageClassT,
  StorageClassesQuery,
  StorageClassesQueryVariables,
  useStorageClassesQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'

const columnHelper = createColumnHelper<StorageClassT>()

export default function StorageClasses() {
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<
      StorageClassListT,
      StorageClassT,
      StorageClassesQuery,
      StorageClassesQueryVariables
    >
      columns={columns}
      query={useStorageClassesQuery}
      queryName="handleGetStorageClassList"
      itemsKey="items"
    />
  )
}
