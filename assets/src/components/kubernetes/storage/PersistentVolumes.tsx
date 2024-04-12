import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { ChipList, useSetBreadcrumbs } from '@pluralsh/design-system'
import { Link } from 'react-router-dom'

import {
  Maybe,
  Persistentvolume_PersistentVolumeList as PersistentVolumeListT,
  Persistentvolume_PersistentVolume as PersistentVolumeT,
  PersistentVolumesQuery,
  PersistentVolumesQueryVariables,
  usePersistentVolumesQuery,
} from '../../../generated/graphql-kubernetes'
import { getBaseBreadcrumbs, useDefaultColumns } from '../common/utils'
import { ResourceList } from '../common/ResourceList'

import { ClusterTinyFragment } from '../../../generated/graphql'
import { InlineLink } from '../../utils/typography/InlineLink'
import {
  PERSISTENT_VOLUMES_REL_PATH,
  getResourceDetailsAbsPath,
  getStorageAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { useCluster } from '../Cluster'

import { PVStatusChip } from './utils'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'storage',
    url: getStorageAbsPath(cluster?.id),
  },
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
  cell: ({ getValue, table }) => {
    const { cluster } = table.options.meta as {
      cluster?: ClusterTinyFragment
    }
    const [namespace, name] = (getValue() ?? '').split('/')

    return (
      <Link
        to={getResourceDetailsAbsPath(
          cluster?.id,
          'persistentvolumeclaim',
          name,
          namespace
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <InlineLink>{getValue()}</InlineLink>
      </Link>
    )
  },
})

const colStorageClass = columnHelper.accessor((pv) => pv.storageClass, {
  id: 'storageClass',
  header: 'Storage class',
  cell: ({ getValue, table }) => {
    const { cluster } = table.options.meta as {
      cluster?: ClusterTinyFragment
    }

    return (
      <Link
        to={getResourceDetailsAbsPath(cluster?.id, 'storageclass', getValue())}
        onClick={(e) => e.stopPropagation()}
      >
        <InlineLink>{getValue()}</InlineLink>
      </Link>
    )
  },
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
  cell: ({ getValue }) => {
    const capacity = getValue()

    return (
      <ChipList
        size="small"
        limit={1}
        values={Object.entries(capacity || {})}
        transformValue={(capacity) => capacity.join(': ')}
        emptyState={null}
      />
    )
  },
})

export const colAccessModes = columnHelper.accessor((pv) => pv.accessModes, {
  id: 'accessModes',
  header: 'Access modes',
  cell: ({ getValue }) => {
    const accessModes = getValue()

    return (
      <ChipList
        size="small"
        limit={1}
        values={Object.entries(accessModes || {})}
        transformValue={(accessModes) => accessModes.join(': ')}
        emptyState={null}
      />
    )
  },
})

export default function PersistentVolumes() {
  const cluster = useCluster()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colName, colLabels, colCreationTimestamp } =
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
    ],
    [colName, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<
      PersistentVolumeListT,
      PersistentVolumeT,
      PersistentVolumesQuery,
      PersistentVolumesQueryVariables
    >
      columns={columns}
      query={usePersistentVolumesQuery}
      queryName="handleGetPersistentVolumeList"
      itemsKey="items"
    />
  )
}
