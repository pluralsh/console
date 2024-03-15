import { createColumnHelper } from '@tanstack/react-table'

import { useMemo } from 'react'

import { ChipList } from '@pluralsh/design-system'

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

const colProvisioner = columnHelper.accessor(
  (storageClass) => storageClass?.provisioner,
  {
    id: 'provisioner',
    header: 'Provisioner',
    cell: ({ getValue }) => getValue(),
  }
)

const colParameters = columnHelper.accessor(
  (storageClass) => storageClass?.parameters,
  {
    id: 'parameters',
    header: 'Parameters',
    cell: ({ getValue }) => {
      const params = getValue()

      return (
        <ChipList
          size="small"
          limit={1}
          values={Object.entries(params || {})}
          transformValue={(params) => params.join(': ')}
        />
      )
    },
  }
)

export default function StorageClasses() {
  const { colName, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [
      colName,
      colProvisioner,
      colParameters,
      colLabels,
      colCreationTimestamp,
    ],
    [colName, colLabels, colCreationTimestamp]
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
