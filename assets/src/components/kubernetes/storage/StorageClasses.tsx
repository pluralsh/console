import { createColumnHelper } from '@tanstack/react-table'

import { useMemo } from 'react'

import { ChipList, useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  Maybe,
  Storageclass_StorageClassList as StorageClassListT,
  Storageclass_StorageClass as StorageClassT,
  StorageClassesQuery,
  StorageClassesQueryVariables,
  useStorageClassesQuery,
} from '../../../generated/graphql-kubernetes'
import { getBaseBreadcrumbs, useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'
import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  STORAGE_CLASSES_REL_PATH,
  getStorageAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useKubernetesContext } from '../Kubernetes'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'storage',
    url: getStorageAbsPath(cluster?.id),
  },
  {
    label: 'storage classes',
    url: `${getStorageAbsPath(cluster?.id)}/${STORAGE_CLASSES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<StorageClassT>()

const colProvisioner = columnHelper.accessor(
  (storageClass) => storageClass.provisioner,
  {
    id: 'provisioner',
    header: 'Provisioner',
    cell: ({ getValue }) => getValue(),
  }
)

const colParameters = columnHelper.accessor(
  (storageClass) => storageClass.parameters,
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
          emptyState={null}
        />
      )
    },
  }
)

export default function StorageClasses() {
  const { cluster } = useKubernetesContext()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

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
