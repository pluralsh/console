import React, { ReactElement, useMemo } from 'react'
import {
  Card,
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { Link, Outlet, useOutletContext, useParams } from 'react-router-dom'

import { useTheme } from 'styled-components'

import {
  ConfigMapQueryVariables,
  Persistentvolume_PersistentVolumeDetail as PersistentVolumeT,
  usePersistentVolumeQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { MetadataSidecar, ResourceLink, useKubernetesCluster } from '../utils'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'

import ResourceDetails, { TabEntry } from '../ResourceDetails'

import { InlineLink } from '../../utils/typography/InlineLink'

import { SubTitle } from '../../utils/SubTitle'

import { ResourceInfoCardEntry } from '../common/ResourceInfoCard'

import { PVStatusChip } from './utils'
import { getBreadcrumbs } from './PersistentVolumes'

const directory: Array<TabEntry> = [
  { path: '', label: 'Info' },
  { path: 'raw', label: 'Raw' },
] as const

export default function PersistentVolume(): ReactElement {
  const cluster = useKubernetesCluster()
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
          url: getResourceDetailsAbsPath(clusterId, 'persistentvolume', name),
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
          <SidecarItem heading="Claim">
            <Link
              to={getResourceDetailsAbsPath(
                cluster?.id,
                'persistentvolumeclaim',
                claimName ?? '',
                claimNamespace
              )}
            >
              <InlineLink>{pv?.claim}</InlineLink>
            </Link>
          </SidecarItem>
          <SidecarItem heading="Storage class">
            <Link
              to={getResourceDetailsAbsPath(
                cluster?.id,
                'storageclass',
                pv?.storageClass ?? ''
              )}
            >
              <InlineLink>{pv?.storageClass}</InlineLink>
            </Link>
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
          <SidecarItem heading="Reason">{pv?.reason || 'None'}</SidecarItem>
          <SidecarItem heading="Message">{pv?.message || 'None'}</SidecarItem>
          <SidecarItem heading="Mount options">
            <ChipList
              size="small"
              limit={1}
              values={pv?.mountOptions ?? []}
              emptyState={<div>None</div>}
            />
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={pv} />
    </ResourceDetails>
  )
}

export function PersistentVolumeInfo(): ReactElement {
  const theme = useTheme()
  const pv = useOutletContext() as PersistentVolumeT
  const source = pv?.persistentVolumeSource

  return (
    <section>
      {/* TODO: Handle all sources. */}
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
                kind="secret"
                name={source.azureFile.secretName}
                namespace={source.azureFile.secretNamespace}
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
                  kind="secret"
                  name={source.cinder.secretRef?.name}
                  namespace={source.cinder.secretRef.namespace}
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
                  kind="secret"
                  name={source.csi.controllerExpandSecretRef?.name}
                  namespace={source.csi.controllerExpandSecretRef?.namespace}
                />
              </ResourceInfoCardEntry>
            )}
            {source.csi.controllerPublishSecretRef && (
              <ResourceInfoCardEntry heading="Controller publish secret">
                <ResourceLink
                  kind="secret"
                  name={source.csi.controllerPublishSecretRef?.name}
                  namespace={source.csi.controllerPublishSecretRef?.namespace}
                />
              </ResourceInfoCardEntry>
            )}
            {source.csi.nodeExpandSecretRef && (
              <ResourceInfoCardEntry heading="Node expand secret">
                <ResourceLink
                  kind="node"
                  name={source.csi.nodeExpandSecretRef?.name}
                  namespace={source.csi.nodeExpandSecretRef?.namespace}
                />
              </ResourceInfoCardEntry>
            )}
            {source.csi.nodePublishSecretRef && (
              <ResourceInfoCardEntry heading="Node publish secret">
                <ResourceLink
                  kind="node"
                  name={source.csi.nodePublishSecretRef?.name}
                  namespace={source.csi.nodePublishSecretRef?.namespace}
                />
              </ResourceInfoCardEntry>
            )}
            {source.csi.nodeStageSecretRef && (
              <ResourceInfoCardEntry heading="Node stage secret">
                <ResourceLink
                  kind="node"
                  name={source.csi.nodeStageSecretRef?.name}
                  namespace={source.csi.nodeStageSecretRef?.namespace}
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
                values={source.fc.targetWWNs}
                limit={5}
              />
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="World Wide IDs">
              <ChipList
                size="small"
                values={source.fc.wwids}
                limit={5}
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
            <ResourceInfoCardEntry heading="Filesystem type">
              {source.nfs.fsType}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Server">
              {source.nfs.server}
            </ResourceInfoCardEntry>
            <ResourceInfoCardEntry heading="Path">
              {source.nfs.path}
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
