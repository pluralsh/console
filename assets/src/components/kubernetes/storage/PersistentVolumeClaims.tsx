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
import { useDefaultColumns } from '../common/utils'
import { ResourceList } from '../common/ResourceList'
import { ClusterTinyFragment } from '../../../generated/graphql'
import { InlineLink } from '../../utils/typography/InlineLink'
import {
  PERSISTENT_VOLUME_CLAIMS_REL_PATH,
  getResourceDetailsAbsPath,
  getStorageAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { useCluster } from '../Cluster'

import { PVCStatusChip } from './utils'
import { getStorageBreadcrumbs } from './Storage'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
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
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
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
      }),
      columnHelper.accessor((pvc) => pvc.storageClass, {
        id: 'storageClass',
        header: 'Storage class',
        cell: ({ getValue, table }) => {
          const { cluster } = table.options.meta as {
            cluster?: ClusterTinyFragment
          }

          return (
            <Link
              to={getResourceDetailsAbsPath(
                cluster?.id,
                'storageclass',
                getValue()
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <InlineLink>{getValue()}</InlineLink>
            </Link>
          )
        },
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
    ],
    [colCreationTimestamp, colLabels, colName, colNamespace]
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
