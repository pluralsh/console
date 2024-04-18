import { createColumnHelper } from '@tanstack/react-table'
import React, { useMemo } from 'react'
import { ChipList, useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  Maybe,
  Persistentvolumeclaim_PersistentVolumeClaimList as PersistentVolumeClaimListT,
  Persistentvolumeclaim_PersistentVolumeClaim as PersistentVolumeClaimT,
  PersistentVolumeClaimsQuery,
  PersistentVolumeClaimsQueryVariables,
  usePersistentVolumeClaimsQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../common/utils'
import { ResourceList } from '../common/ResourceList'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import {
  PERSISTENT_VOLUME_CLAIMS_REL_PATH,
  getStorageAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { Kind } from '../common/types'
import ResourceLink from '../common/ResourceLink'

import { PVCStatusChip } from './utils'
import { getStorageBreadcrumbs } from './Storage'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getStorageBreadcrumbs(cluster),
  {
    label: 'persistent volume claims',
    url: `${getStorageAbsPath(
      cluster?.id
    )}/${PERSISTENT_VOLUME_CLAIMS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<PersistentVolumeClaimT>()

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
  const columns = usePersistentVolumeClaimListColumns()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  return (
    <ResourceList<
      PersistentVolumeClaimListT,
      PersistentVolumeClaimT,
      PersistentVolumeClaimsQuery,
      PersistentVolumeClaimsQueryVariables
    >
      namespaced
      columns={columns}
      query={usePersistentVolumeClaimsQuery}
      queryName="handleGetPersistentVolumeClaimList"
      itemsKey="items"
    />
  )
}
