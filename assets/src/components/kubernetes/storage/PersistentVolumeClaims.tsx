import { ChipList, useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import { Maybe } from '../../../generated/graphql-kubernetes'

import {
  PersistentvolumeclaimPersistentVolumeClaim,
  PersistentvolumeclaimPersistentVolumeClaimList,
} from '../../../generated/kubernetes'
import {
  getAllPersistentVolumeClaimsInfiniteOptions,
  getPersistentVolumeClaimsInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import {
  PERSISTENT_VOLUME_CLAIMS_REL_PATH,
  getStorageAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { useDataSelect } from '../common/DataSelect'
import ResourceLink from '../common/ResourceLink'
import { UpdatedResourceList } from '../common/UpdatedResourceList'
import { Kind } from '../common/types'
import { useDefaultColumns } from '../common/utils'
import { getStorageBreadcrumbs } from './Storage'

import { PVCStatusChip } from './utils'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getStorageBreadcrumbs(cluster),
  {
    label: 'persistent volume claims',
    url: `${getStorageAbsPath(
      cluster?.id
    )}/${PERSISTENT_VOLUME_CLAIMS_REL_PATH}`,
  },
]

const columnHelper =
  createColumnHelper<PersistentvolumeclaimPersistentVolumeClaim>()

export const colCapacity = columnHelper.accessor((pvc) => pvc.capacity, {
  id: 'capacity',
  header: 'Capacity',
  cell: ({ getValue }) => (
    <ChipList
      size="small"
      limit={1}
      values={Object.entries(getValue() || {})}
      transformValue={(capacity) => capacity.join(': ')}
      emptyState={null}
    />
  ),
})

export const usePersistentVolumeClaimListColumns = () => {
  const { colAction, colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)

  return useMemo(
    () => [
      colName,
      colNamespace,
      columnHelper.accessor((pvc) => pvc.status, {
        id: 'status',
        header: 'Status',
        cell: ({ getValue }) => <PVCStatusChip status={getValue()} />,
      }),
      columnHelper.accessor((pvc) => pvc.volume, {
        id: 'volume',
        header: 'Volume',
        cell: ({ getValue }) => (
          <ResourceLink
            objectRef={{
              kind: Kind.PersistentVolume,
              name: getValue(),
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      }),
      columnHelper.accessor((pvc) => pvc.storageClass, {
        id: 'storageClass',
        header: 'Storage class',
        cell: ({ getValue }) => (
          <ResourceLink
            objectRef={{
              kind: Kind.StorageClass,
              name: getValue(),
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      }),
      columnHelper.accessor((pvc) => pvc.accessModes, {
        id: 'accessModes',
        header: 'Access modes',
        cell: ({ getValue }) => (
          <ChipList
            size="small"
            limit={1}
            values={Object.entries(getValue() || {})}
            transformValue={(accessModes) => accessModes.join(': ')}
            emptyState={null}
          />
        ),
      }),
      colCapacity,
      colLabels,
      colCreationTimestamp,
      colAction,
    ],
    [colCreationTimestamp, colLabels, colName, colNamespace, colAction]
  )
}

export default function PersistentVolumeClaims() {
  const cluster = useCluster()
  const { hasNamespaceFilterActive } = useDataSelect()
  const columns = usePersistentVolumeClaimListColumns()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  return (
    <UpdatedResourceList<
      PersistentvolumeclaimPersistentVolumeClaimList,
      PersistentvolumeclaimPersistentVolumeClaim
    >
      namespaced
      columns={columns}
      queryOptions={
        hasNamespaceFilterActive
          ? getPersistentVolumeClaimsInfiniteOptions
          : getAllPersistentVolumeClaimsInfiniteOptions
      }
      itemsKey="items"
    />
  )
}
