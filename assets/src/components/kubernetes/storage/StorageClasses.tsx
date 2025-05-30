import { ChipList, useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'

import { useMemo } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'

import {
  Maybe,
  Storageclass_StorageClass as StorageClassT,
  Storageclass_StorageClassList as StorageClassListT,
  StorageClassesDocument,
  StorageClassesQuery,
  StorageClassesQueryVariables,
} from '../../../generated/graphql-kubernetes'
import {
  getStorageAbsPath,
  STORAGE_CLASSES_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { ResourceList } from '../common/ResourceList'
import { useDefaultColumns } from '../common/utils'

import { getStorageBreadcrumbs } from './Storage'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getStorageBreadcrumbs(cluster),
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
    cell: ({ getValue }) => (
      <ChipList
        size="small"
        limit={1}
        values={Object.entries(getValue() || {})}
        transformValue={(params) => params.join(': ')}
        emptyState={null}
      />
    ),
  }
)

export default function StorageClasses() {
  const cluster = useCluster()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colAction, colName, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [
      colName,
      colProvisioner,
      colParameters,
      colLabels,
      colCreationTimestamp,
      colAction,
    ],
    [colName, colLabels, colCreationTimestamp, colAction]
  )

  return (
    <ResourceList<
      StorageClassListT,
      StorageClassT,
      StorageClassesQuery,
      StorageClassesQueryVariables
    >
      columns={columns}
      queryDocument={StorageClassesDocument}
      queryName="handleGetStorageClassList"
      itemsKey="items"
    />
  )
}
