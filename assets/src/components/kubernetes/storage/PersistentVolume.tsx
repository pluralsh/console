import { ReactElement, useMemo } from 'react'
import {
  Card,
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

import {
  ConfigMapQueryVariables,
  Persistentvolume_PersistentVolumeDetail as PersistentVolumeT,
  usePersistentVolumeQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { MetadataSidecar } from '../common/utils'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { SubTitle } from '../../utils/SubTitle'
import { ResourceInfoCardEntry } from '../common/ResourceInfoCard'
import { useCluster } from '../Cluster'
import ResourceLink from '../common/ResourceLink'
import { Kind } from '../common/types'

import { PVStatusChip } from './utils'
import { getBreadcrumbs } from './PersistentVolumes'

const directory: Array<TabEntry> = [
  { path: '', label: 'Info' },
  { path: 'raw', label: 'Raw' },
] as const

export default function PersistentVolume(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId, name = '' } = useParams()
  const { data, loading } = usePersistentVolumeQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
    } as ConfigMapQueryVariables,
  })

  const pv = data?.handleGetPersistentVolumeDetail

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(
            clusterId,
            Kind.PersistentVolume,
            name
          ),
        },
      ],
      [cluster, clusterId, name]
    )
  )

  const [claimNamespace, claimName] = (pv?.claim ?? '').split('/')

  if (loading) return <LoadingIndicator />

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={
        <MetadataSidecar resource={pv}>
          <SidecarItem heading="Capacity">
            <ChipList
              size="small"
              limit={3}
              values={Object.entries(pv?.capacity || {})}
              transformValue={(capacity) => capacity.join(': ')}
              emptyState={null}
            />
          </SidecarItem>
          <SidecarItem heading="Claim">
            <ResourceLink
              objectRef={{
                kind: Kind.PersistentVolumeClaim,
                name: claimName,
                namespace: claimNamespace,
              }}
            />
          </SidecarItem>
          <SidecarItem heading="Storage class">
            <ResourceLink
              objectRef={{
                kind: Kind.StorageClass,
                name: pv?.storageClass,
              }}
            />
          </SidecarItem>
          <SidecarItem heading="Status">
            <PVStatusChip status={pv?.status} />
          </SidecarItem>
          <SidecarItem heading="Access modes">
            <ChipList
              size="small"
              limit={1}
              values={Object.entries(pv?.accessModes || {})}
              transformValue={(accessModes) => accessModes.join(': ')}
              emptyState={null}
            />
          </SidecarItem>
          <SidecarItem heading="Reclaim policy">
            {pv?.reclaimPolicy}
          </SidecarItem>
          <SidecarItem heading="Reason">{pv?.reason || '-'}</SidecarItem>
          <SidecarItem heading="Message">{pv?.message || '-'}</SidecarItem>
          <SidecarItem heading="Mount options">
            <ChipList
              size="small"
              limit={1}
              values={pv?.mountOptions ?? []}
              emptyState={<div>-</div>}
            />
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={pv} />
    </ResourceDetails>
  )
}

export function PersistentVolumeInfo(): ReactElement<any> {
  const theme = useTheme()
  const pv = useOutletContext() as PersistentVolumeT
  const source = pv?.persistentVolumeSource

  return (
    <section>
      <SubTitle>Source</SubTitle>
      <Card
        css={{
          display: 'flex',
          gap: theme.spacing.large,
          padding: theme.spacing.medium,
          flexWrap: 'wrap',
        }}
      >
        {source?.awsElasticBlockStore && (
          <>
            <ResourceInfoCardEntry heading="Type">
              AWS Elastic Block Store
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Filesystem type">
              {source.awsElasticBlockStore.fsType}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Readonly">
              {source.awsElasticBlockStore.readOnly}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Volume ID">
              {source.awsElasticBlockStore.volumeID}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Partition">
              {source.awsElasticBlockStore.partition}
            </ResourceInfoCardEntry>
          </>
        )}
        {source?.azureDisk && (
          <>
            <ResourceInfoCardEntry heading="Type">
              Azure disk
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Filesystem type">
              {source.azureDisk.fsType}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Readonly">
              {source.azureDisk.readOnly}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Disk name">
              {source.azureDisk.diskName}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Disk URI">
              {source.azureDisk.diskURI}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Kind">
              {source.azureDisk.kind}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Caching mode">
              {source.azureDisk.cachingMode}
            </ResourceInfoCardEntry>
          </>
        )}
        {source?.azureFile && (
          <>
            <ResourceInfoCardEntry heading="Type">
              Azure file
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Share name">
              {source.azureFile.shareName}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Readonly">
              {source.azureFile.readOnly}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Secret">
              <ResourceLink
                objectRef={{
                  kind: Kind.Secret,
                  namespace: source?.azureFile?.secretNamespace,
                  name: source?.azureFile?.secretName,
                }}
              />
            </ResourceInfoCardEntry>
          </>
        )}
        {source?.cephfs && (
          <>
            <ResourceInfoCardEntry heading="Type">
              Ceph Storage Cluster
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Readonly">
              {source.cephfs.readOnly}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Path">
              {source.cephfs.path}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="User">
              {source.cephfs.user}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Monitors">
              <ChipList
                size="small"
                values={source.cephfs.monitors ?? []}
                limit={5}
              />
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Secret file">
              {source.cephfs.secretFile}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Secret">
              <ResourceLink
                objectRef={{
                  kind: Kind.Secret,
                  namespace: source.cephfs.secretRef?.namespace,
                  name: source.cephfs.secretRef?.name,
                }}
              />
            </ResourceInfoCardEntry>
          </>
        )}
        {source?.cinder && (
          <>
            <ResourceInfoCardEntry heading="Type">Cinder</ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Filesystem type">
              {source.cinder.fsType}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Readonly">
              {source.cinder.readOnly}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Volume ID">
              {source.cinder.volumeID}
            </ResourceInfoCardEntry>
            {source.cinder.secretRef && (
              <ResourceInfoCardEntry heading="Secret">
                <ResourceLink
                  objectRef={{
                    kind: Kind.Secret,
                    namespace: source.cinder.secretRef?.namespace,
                    name: source.cinder.secretRef?.name,
                  }}
                />
              </ResourceInfoCardEntry>
            )}
          </>
        )}
        {source?.csi && (
          <>
            <ResourceInfoCardEntry heading="Type">CSI</ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Filesystem type">
              {source.csi.fsType}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Readonly">
              {source.csi.readOnly}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Driver">
              {source.csi.driver}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Volume handle">
              {source.csi.volumeHandle}
            </ResourceInfoCardEntry>
            {source.csi.controllerExpandSecretRef && (
              <ResourceInfoCardEntry heading="Controller expand secret">
                <ResourceLink
                  objectRef={{
                    kind: Kind.Secret,
                    namespace: source.csi.controllerExpandSecretRef?.namespace,
                    name: source.csi.controllerExpandSecretRef?.name,
                  }}
                />
              </ResourceInfoCardEntry>
            )}
            {source.csi.controllerPublishSecretRef && (
              <ResourceInfoCardEntry heading="Controller publish secret">
                <ResourceLink
                  objectRef={{
                    kind: Kind.Secret,
                    namespace: source.csi.controllerPublishSecretRef?.namespace,
                    name: source.csi.controllerPublishSecretRef?.name,
                  }}
                />
              </ResourceInfoCardEntry>
            )}
            {source.csi.nodeExpandSecretRef && (
              <ResourceInfoCardEntry heading="Node expand secret">
                <ResourceLink
                  objectRef={{
                    kind: Kind.Secret,
                    namespace: source.csi.nodeExpandSecretRef?.namespace,
                    name: source.csi.nodeExpandSecretRef?.name,
                  }}
                />
              </ResourceInfoCardEntry>
            )}
            {source.csi.nodePublishSecretRef && (
              <ResourceInfoCardEntry heading="Node publish secret">
                <ResourceLink
                  objectRef={{
                    kind: Kind.Secret,
                    namespace: source.csi.nodePublishSecretRef?.namespace,
                    name: source.csi.nodePublishSecretRef?.name,
                  }}
                />
              </ResourceInfoCardEntry>
            )}
            {source.csi.nodeStageSecretRef && (
              <ResourceInfoCardEntry heading="Node stage secret">
                <ResourceLink
                  objectRef={{
                    kind: Kind.Secret,
                    namespace: source.csi.nodeStageSecretRef?.namespace,
                    name: source.csi.nodeStageSecretRef?.name,
                  }}
                />
              </ResourceInfoCardEntry>
            )}
            <ResourceInfoCardEntry heading="Volume attributes">
              <ChipList
                size="small"
                values={Object.entries(source.csi.volumeAttributes)}
                transformValue={(label) => label.join(': ')}
                limit={5}
              />
            </ResourceInfoCardEntry>
          </>
        )}
        {source?.fc && (
          <>
            <ResourceInfoCardEntry heading="Type">
              Fibre Channel
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Filesystem type">
              {source.fc.fsType}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Readonly">
              {source.fc.readOnly}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Lun number">
              {source.fc.lun}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Target World Wide Names">
              <ChipList
                size="small"
                values={source.fc.targetWWNs ?? []}
                limit={5}
              />
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="World Wide IDs">
              <ChipList
                size="small"
                values={source.fc.wwids ?? []}
                limit={5}
              />
            </ResourceInfoCardEntry>
          </>
        )}
        {source?.flexVolume && (
          <>
            <ResourceInfoCardEntry heading="Type">
              Flex Volume
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Filesystem type">
              {source.flexVolume.fsType}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Readonly">
              {source.flexVolume.readOnly}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Driver">
              {source.flexVolume.driver}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Driver">
              {source.flexVolume.options}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Secret">
              <ResourceLink
                objectRef={{
                  kind: Kind.Secret,
                  namespace: source.flexVolume.secretRef?.namespace,
                  name: source.flexVolume.secretRef?.name,
                }}
              />
            </ResourceInfoCardEntry>
          </>
        )}
        {source?.flocker && (
          <>
            <ResourceInfoCardEntry heading="Type">
              Flocker
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Dataset name">
              {source.flocker.datasetName}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Dataset UUID">
              {source.flocker.datasetUUID}
            </ResourceInfoCardEntry>
          </>
        )}
        {source?.gcePersistentDisk && (
          <>
            <ResourceInfoCardEntry heading="Type">
              GCE Persistent Disk
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Filesystem type">
              {source.gcePersistentDisk.fsType}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Readonly">
              {source.gcePersistentDisk.readOnly}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Persistent disk name">
              {source.gcePersistentDisk.pdName}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Partition">
              {source.gcePersistentDisk.partition}
            </ResourceInfoCardEntry>
          </>
        )}
        {source?.glusterfs && (
          <>
            <ResourceInfoCardEntry heading="Type">
              Gluster
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Readonly">
              {source.glusterfs.readOnly}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Path">
              {source.glusterfs.path}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Endpoints">
              {source.glusterfs.endpoints}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Endpoints namespace">
              {source.glusterfs.endpointsNamespace}
            </ResourceInfoCardEntry>
          </>
        )}
        {source?.hostPath && (
          <>
            <ResourceInfoCardEntry heading="Type">
              Host path
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Host path type">
              {source.hostPath.type}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Path">
              {source.hostPath.path}
            </ResourceInfoCardEntry>
          </>
        )}
        {source?.iscsi && (
          <>
            <ResourceInfoCardEntry heading="Type">iSCSI</ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Filesystem type">
              {source.iscsi.fsType}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Readonly">
              {source.iscsi.readOnly}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Target portal">
              {source.iscsi.targetPortal}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Target lun number">
              {source.iscsi.lun}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Qualified name">
              {source.iscsi.iqn}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Discovery CHAP authentication">
              {source.iscsi.chapAuthDiscovery}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Session CHAP authentication">
              {source.iscsi.chapAuthSession}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Initiator name">
              {source.iscsi.initiatorName}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Interface name">
              {source.iscsi.iscsiInterface}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Target portal">
              {source.iscsi.targetPortal}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Portals">
              <ChipList
                size="small"
                values={source.iscsi.portals ?? []}
                limit={5}
              />
            </ResourceInfoCardEntry>
          </>
        )}
        {source?.local && (
          <>
            <ResourceInfoCardEntry heading="Type">Local</ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Filesystem type">
              {source.local.fsType}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Path">
              {source.local.path}
            </ResourceInfoCardEntry>
          </>
        )}
        {source?.nfs && (
          <>
            <ResourceInfoCardEntry heading="Type">NFS</ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Readonly">
              {source.nfs.readOnly}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Server">
              {source.nfs.server}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Path">
              {source.nfs.path}
            </ResourceInfoCardEntry>
          </>
        )}
        {source?.photonPersistentDisk && (
          <>
            <ResourceInfoCardEntry heading="Type">
              Photon OS persistent disk
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Filesystem type">
              {source.photonPersistentDisk.fsType}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Persistent disk ID">
              {source.photonPersistentDisk.pdID}
            </ResourceInfoCardEntry>
          </>
        )}
        {source?.portworxVolume && (
          <>
            <ResourceInfoCardEntry heading="Type">
              Portworx volume
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Filesystem type">
              {source.portworxVolume.fsType}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Readonly">
              {source.portworxVolume.readOnly}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Volume ID">
              {source.portworxVolume.volumeID}
            </ResourceInfoCardEntry>
          </>
        )}
        {source?.quobyte && (
          <>
            <ResourceInfoCardEntry heading="Type">
              Quobyte
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Readonly">
              {source.quobyte.readOnly}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Volume">
              {source.quobyte.volume}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="User">
              {source.quobyte.user}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Group">
              {source.quobyte.group}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Registry">
              {source.quobyte.registry}
            </ResourceInfoCardEntry>
          </>
        )}
        {source?.rbd && (
          <>
            <ResourceInfoCardEntry heading="Type">RBD</ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Filesystem type">
              {source.rbd.fsType}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Readonly">
              {source.rbd.readOnly}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Image">
              {source.rbd.image}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Keyring">
              {source.rbd.keyring}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Pool">
              {source.rbd.pool}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="User">
              {source.rbd.user}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Monitors">
              <ChipList
                size="small"
                values={source.rbd.monitors ?? []}
                limit={5}
              />
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Secret">
              <ResourceLink
                objectRef={{
                  kind: Kind.Secret,
                  namespace: source.rbd.secretRef?.namespace,
                  name: source.rbd.secretRef?.name,
                }}
              />
            </ResourceInfoCardEntry>
          </>
        )}
        {source?.scaleIO && (
          <>
            <ResourceInfoCardEntry heading="Type">
              ScaleIO
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Filesystem type">
              {source.scaleIO.fsType}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Readonly">
              {source.scaleIO.readOnly}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Volume name">
              {source.scaleIO.volumeName}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Gateway">
              {source.scaleIO.gateway}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Protection domain">
              {source.scaleIO.protectionDomain}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="SSL enabled">
              {source.scaleIO.sslEnabled}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Storage mode">
              {source.scaleIO.storageMode}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Storage pool">
              {source.scaleIO.storagePool}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="System">
              {source.scaleIO.system}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Secret">
              <ResourceLink
                objectRef={{
                  kind: Kind.Secret,
                  namespace: source.scaleIO.secretRef?.namespace,
                  name: source.scaleIO.secretRef?.name,
                }}
              />
            </ResourceInfoCardEntry>
          </>
        )}
        {source?.storageos && (
          <>
            <ResourceInfoCardEntry heading="Type">
              StorageOS
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Filesystem type">
              {source.storageos.fsType}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Readonly">
              {source.storageos.readOnly}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Volume name">
              {source.storageos.volumeName}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Volume namespace">
              {source.storageos.volumeNamespace}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Secret">
              <ResourceLink
                objectRef={{
                  kind: Kind.Secret,
                  namespace: source.storageos.secretRef?.namespace,
                  name: source.storageos.secretRef?.name,
                }}
              />
            </ResourceInfoCardEntry>
          </>
        )}
        {source?.vsphereVolume && (
          <>
            <ResourceInfoCardEntry heading="Type">
              vSphere volume
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Filesystem type">
              {source.vsphereVolume.fsType}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Volume path">
              {source.vsphereVolume.volumePath}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Storage policy ID">
              {source.vsphereVolume.storagePolicyID}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Storage policy name">
              {source.vsphereVolume.storagePolicyName}
            </ResourceInfoCardEntry>
          </>
        )}
      </Card>
    </section>
  )
}
