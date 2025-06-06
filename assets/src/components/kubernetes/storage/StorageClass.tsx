import {
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ReactElement, useMemo } from 'react'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import {
  ConfigMapQueryVariables,
  Storageclass_StorageClass as StorageClassT,
  Storageclass_StorageClassList as StorageClassListT,
  StorageClassPersistentVolumesDocument,
  StorageClassPersistentVolumesQuery,
  StorageClassPersistentVolumesQueryVariables,
  useStorageClassQuery,
} from '../../../generated/graphql-kubernetes'

import { KubernetesClient } from '../../../helpers/kubernetes.client'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { useCluster } from '../Cluster'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { ResourceList } from '../common/ResourceList'
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
  const { clusterId, name = '' } = useParams()
  const { data, loading } = useStorageClassQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: { name } as ConfigMapQueryVariables,
  })

  const sc = data?.handleGetStorageClass

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

  if (loading) return <LoadingIndicator />

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

const columnHelper = createColumnHelper<StorageClassT>()

export function StorageClassPersistentVolumes(): ReactElement<any> {
  const sc = useOutletContext() as StorageClassT

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
        StorageClassListT,
        StorageClassT,
        StorageClassPersistentVolumesQuery,
        StorageClassPersistentVolumesQueryVariables
      >
        columns={columns}
        queryDocument={StorageClassPersistentVolumesDocument}
        queryOptions={{
          variables: {
            name: sc?.objectMeta.name,
          } as StorageClassPersistentVolumesQueryVariables,
        }}
        queryName="handleGetStorageClassPersistentVolumes"
        itemsKey="items"
      />
    </section>
  )
}
