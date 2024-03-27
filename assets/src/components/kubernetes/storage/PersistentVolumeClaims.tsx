import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { ChipList, useSetBreadcrumbs } from '@pluralsh/design-system'
import { Link } from 'react-router-dom'

import {
  Maybe,
  Persistentvolumeclaim_PersistentVolumeClaimList as PersistentVolumeClaimListT,
  Persistentvolumeclaim_PersistentVolumeClaim as PersistentVolumeClaimT,
  PersistentVolumeClaimsQuery,
  PersistentVolumeClaimsQueryVariables,
  usePersistentVolumeClaimsQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'
import { ClusterTinyFragment } from '../../../generated/graphql'
import { InlineLink } from '../../utils/typography/InlineLink'
import {
  PERSISTENT_VOLUME_CLAIMS_REL_PATH,
  getKubernetesAbsPath,
  getResourceDetailsAbsPath,
  getStorageAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { useKubernetesContext } from '../Kubernetes'

import { PVCStatusChip } from './utils'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  {
    label: 'kubernetes',
    url: getKubernetesAbsPath(cluster?.id),
  },
  {
    label: cluster?.name ?? '',
    url: getKubernetesAbsPath(cluster?.id),
  },
  {
    label: 'storage',
    url: getStorageAbsPath(cluster?.id),
  },
  {
    label: 'persistent volume claims',
    url: `${getStorageAbsPath(
      cluster?.id
    )}/${PERSISTENT_VOLUME_CLAIMS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<PersistentVolumeClaimT>()

const colStatus = columnHelper.accessor((pvc) => pvc.status, {
  id: 'status',
  header: 'Status',
  cell: ({ getValue }) => <PVCStatusChip status={getValue()} />,
})

const colVolume = columnHelper.accessor((pvc) => pvc.volume, {
  id: 'volume',
  header: 'Volume',
  cell: ({ getValue, table }) => {
    const { cluster } = table.options.meta as {
      cluster?: ClusterTinyFragment
    }

    return (
      <Link
        to={getResourceDetailsAbsPath(
          cluster?.id,
          'persistentvolume',
          getValue()
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <InlineLink>{getValue()}</InlineLink>
      </Link>
    )
  },
})

const colStorageClass = columnHelper.accessor((pvc) => pvc.storageClass, {
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

const colAccessModes = columnHelper.accessor((pvc) => pvc.accessModes, {
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

export default function PersistentVolumeClaims() {
  const { cluster } = useKubernetesContext()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [
      colName,
      colNamespace,
      colStatus,
      colVolume,
      colStorageClass,
      // TODO: Add capacity after solving type issue.
      colAccessModes,
      colLabels,
      colCreationTimestamp,
    ],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

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
