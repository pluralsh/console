import {
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ReactElement, useMemo } from 'react'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AxiosInstance } from '../../../helpers/axios.ts'

import {
  PersistentvolumePersistentVolume,
  PersistentvolumePersistentVolumeList,
  StorageclassStorageClass,
} from '../../../generated/kubernetes'
import {
  getStorageClassOptions,
  getStorageClassPersistentVolumesInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { GqlError } from '../../utils/Alert'
import { useCluster } from '../Cluster'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { ResourceList } from '../common/ResourceList.tsx'
import { Kind } from '../common/types'
import { MetadataSidecar, useDefaultColumns } from '../common/utils'
import {
  colAccessModes,
  colCapacity,
  colClaim,
  colReason,
  colReclaimPolicy,
  colStatus,
} from './PersistentVolumes'

import { getBreadcrumbs } from './StorageClasses'

const directory: Array<TabEntry> = [
  { path: '', label: 'Persistent Volumes' },
  { path: 'raw', label: 'Raw' },
] as const

export default function StorageClass(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId = '', name = '' } = useParams()
  const {
    data: sc,
    isFetching,
    error,
  } = useQuery({
    ...getStorageClassOptions({
      client: AxiosInstance(clusterId),
      path: { storageclass: name },
    }),
    refetchInterval: 30_000,
  })

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(clusterId, Kind.StorageClass, name),
        },
      ],
      [cluster, clusterId, name]
    )
  )

  if (error) {
    return <GqlError error={error} />
  }

  if (isFetching) {
    return <LoadingIndicator />
  }

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={
        <MetadataSidecar resource={sc}>
          <SidecarItem heading="Parameters">
            <ChipList
              size="small"
              limit={5}
              values={Object.entries(sc?.parameters || {})}
              transformValue={(params) => params.join(': ')}
              emptyState={null}
            />
          </SidecarItem>
          <SidecarItem heading="Provisioner">{sc?.provisioner}</SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={sc} />
    </ResourceDetails>
  )
}

const columnHelper = createColumnHelper<PersistentvolumePersistentVolume>()

export function StorageClassPersistentVolumes(): ReactElement<any> {
  const sc = useOutletContext() as StorageclassStorageClass

  const { colName, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [
      colName,
      colStatus,
      colClaim,
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
    <section>
      <ResourceList<
        PersistentvolumePersistentVolumeList,
        PersistentvolumePersistentVolume
      >
        columns={columns}
        queryOptions={getStorageClassPersistentVolumesInfiniteOptions}
        pathParams={{ storageClass: sc?.objectMeta.name }}
        itemsKey="items"
      />
    </section>
  )
}
