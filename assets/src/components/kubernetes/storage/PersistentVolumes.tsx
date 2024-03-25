import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { ChipList } from '@pluralsh/design-system'

import {
  Persistentvolume_PersistentVolumeList as PersistentVolumeListT,
  Persistentvolume_PersistentVolume as PersistentVolumeT,
  PersistentVolumesQuery,
  PersistentVolumesQueryVariables,
  usePersistentVolumesQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'

import { ClusterTinyFragment } from '../../../generated/graphql'
import { InlineLink } from '../../utils/typography/InlineLink'
import {
  STORAGE_CLASSES_REL_PATH,
  getStorageResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { PVStatusChip } from './utils'

const columnHelper = createColumnHelper<PersistentVolumeT>()

const colStatus = columnHelper.accessor((pv) => pv.status, {
  id: 'status',
  header: 'Status',
  cell: ({ getValue }) => <PVStatusChip status={getValue()} />,
})

const colClaim = columnHelper.accessor((pv) => pv.claim, {
  id: 'claim',
  header: 'Claim',
  cell: ({ getValue, table }) => {
    const { cluster } = table.options.meta as {
      cluster?: ClusterTinyFragment
    }
    const [name, namespace] = (getValue() ?? '').split('/')

    return (
      <InlineLink
        href={getStorageResourceDetailsAbsPath(
          STORAGE_CLASSES_REL_PATH,
          cluster?.id,
          name,
          namespace
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {getValue()}
      </InlineLink>
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
      <InlineLink
        href={getStorageResourceDetailsAbsPath(
          STORAGE_CLASSES_REL_PATH,
          cluster?.id,
          getValue()
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {getValue()}
      </InlineLink>
    )
  },
})

const colReclaimPolicy = columnHelper.accessor((pv) => pv.reclaimPolicy, {
  id: 'reclaimPolicy',
  header: 'Reclaim policy',
  cell: ({ getValue }) => getValue(),
})

const colReason = columnHelper.accessor((pv) => pv.reason, {
  id: 'reason',
  header: 'Reason',
  cell: ({ getValue }) => getValue(),
})

const colAccessModes = columnHelper.accessor((pv) => pv.accessModes, {
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
      // TODO: Add capacity after solving type issue.
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
