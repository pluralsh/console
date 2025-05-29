import { ChipList, useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'

import {
  Maybe,
  Persistentvolume_PersistentVolume as PersistentVolumeT,
  Persistentvolume_PersistentVolumeList as PersistentVolumeListT,
  PersistentVolumesDocument,
  PersistentVolumesQuery,
  PersistentVolumesQueryVariables,
} from '../../../generated/graphql-kubernetes'
import {
  getStorageAbsPath,
  PERSISTENT_VOLUMES_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import ResourceLink from '../common/ResourceLink'
import { ResourceList } from '../common/ResourceList'
import { Kind } from '../common/types'
import { useDefaultColumns } from '../common/utils'
import { getStorageBreadcrumbs } from './Storage'

import { PVStatusChip } from './utils'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getStorageBreadcrumbs(cluster),
  {
    label: 'persistent volumes',
    url: `${getStorageAbsPath(cluster?.id)}/${PERSISTENT_VOLUMES_REL_PATH}`,
  },
]

export const columnHelper = createColumnHelper<PersistentVolumeT>()

export const colStatus = columnHelper.accessor((pv) => pv.status, {
  id: 'status',
  header: 'Status',
  cell: ({ getValue }) => <PVStatusChip status={getValue()} />,
})

export const colClaim = columnHelper.accessor((pv) => pv.claim, {
  id: 'claim',
  header: 'Claim',
  cell: ({ getValue }) => {
    const [namespace, name] = (getValue() ?? '').split('/')

    return (
      <ResourceLink
        objectRef={{
          kind: Kind.PersistentVolumeClaim,
          name,
          namespace,
        }}
        onClick={(e) => e.stopPropagation()}
      />
    )
  },
})

const colStorageClass = columnHelper.accessor((pv) => pv.storageClass, {
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
})

export const colReclaimPolicy = columnHelper.accessor(
  (pv) => pv.reclaimPolicy,
  {
    id: 'reclaimPolicy',
    header: 'Reclaim policy',
    cell: ({ getValue }) => getValue(),
  }
)

export const colReason = columnHelper.accessor((pv) => pv.reason, {
  id: 'reason',
  header: 'Reason',
  cell: ({ getValue }) => getValue(),
})

export const colCapacity = columnHelper.accessor((pv) => pv.capacity, {
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

export const colAccessModes = columnHelper.accessor((pv) => pv.accessModes, {
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
})

export default function PersistentVolumes() {
  const cluster = useCluster()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colAction, colName, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [
      colName,
      colStatus,
      colClaim,
      colStorageClass,
      colReclaimPolicy,
      colReason,
      colCapacity,
      colAccessModes,
      colLabels,
      colCreationTimestamp,
      colAction,
    ],
    [colName, colLabels, colCreationTimestamp, colAction]
  )

  return (
    <ResourceList<
      PersistentVolumeListT,
      PersistentVolumeT,
      PersistentVolumesQuery,
      PersistentVolumesQueryVariables
    >
      columns={columns}
      queryDocument={PersistentVolumesDocument}
      queryName="handleGetPersistentVolumeList"
      itemsKey="items"
    />
  )
}
