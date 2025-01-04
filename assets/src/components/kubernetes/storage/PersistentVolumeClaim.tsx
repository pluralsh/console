import { ReactElement, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import {
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { MetadataSidecar } from '../common/utils'
import {
  SecretQueryVariables,
  usePersistentVolumeClaimQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import {
  PERSISTENT_VOLUME_CLAIMS_REL_PATH,
  getResourceDetailsAbsPath,
  getStorageAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { NAMESPACE_PARAM } from '../Navigation'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { useCluster } from '../Cluster'
import { Kind } from '../common/types'
import ResourceLink from '../common/ResourceLink'

import { getBreadcrumbs } from './PersistentVolumeClaims'
import { PVCStatusChip } from './utils'

const directory: Array<TabEntry> = [{ path: '', label: 'Raw' }] as const

export default function PersistentVolumeClaim(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId, name = '', namespace = '' } = useParams()
  const { data, loading } = usePersistentVolumeClaimQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
      namespace,
    } as SecretQueryVariables,
  })

  const pvc = data?.handleGetPersistentVolumeClaimDetail

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: namespace ?? '',
          url: `${getStorageAbsPath(
            cluster?.id
          )}/${PERSISTENT_VOLUME_CLAIMS_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(
            clusterId,
            Kind.PersistentVolumeClaim,
            name,
            namespace
          ),
        },
      ],
      [cluster, clusterId, name, namespace]
    )
  )

  if (loading) return <LoadingIndicator />

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={
        <MetadataSidecar resource={pvc}>
          <SidecarItem heading="Capacity">
            <ChipList
              size="small"
              limit={3}
              values={Object.entries(pvc?.capacity || {})}
              transformValue={(capacity) => capacity.join(': ')}
              emptyState={null}
            />
          </SidecarItem>
          <SidecarItem heading="Volume">
            <ResourceLink
              objectRef={{
                kind: Kind.PersistentVolume,
                name: pvc?.volume,
              }}
            />
          </SidecarItem>
          <SidecarItem heading="Storage class">
            <ResourceLink
              objectRef={{
                kind: Kind.StorageClass,
                name: pvc?.storageClass,
              }}
            />
          </SidecarItem>
          <SidecarItem heading="Status">
            <PVCStatusChip status={pvc?.status} />
          </SidecarItem>
          <SidecarItem heading="Access modes">
            <ChipList
              size="small"
              limit={1}
              values={Object.entries(pvc?.accessModes || {})}
              transformValue={(accessModes) => accessModes.join(': ')}
              emptyState={null}
            />
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={pvc} />
    </ResourceDetails>
  )
}
