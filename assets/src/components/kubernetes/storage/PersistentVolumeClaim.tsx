import { ReactElement, useMemo } from 'react'

import { Link, Outlet, useParams } from 'react-router-dom'

import {
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import ResourceDetails, { TabEntry } from '../ResourceDetails'
import { MetadataSidecar, useKubernetesCluster } from '../utils'
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
import { NAMESPACE_PARAM } from '../Kubernetes'
import LoadingIndicator from '../../utils/LoadingIndicator'

import { InlineLink } from '../../utils/typography/InlineLink'

import { getBreadcrumbs } from './PersistentVolumeClaims'
import { PVCStatusChip } from './utils'

const directory: Array<TabEntry> = [{ path: '', label: 'Raw' }] as const

export default function PersistentVolumeClaim(): ReactElement {
  const cluster = useKubernetesCluster()
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
            'persistentvolumeclaim',
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
          <SidecarItem heading="Volume">
            <Link
              to={getResourceDetailsAbsPath(
                cluster?.id,
                'persistentvolume',
                pvc?.volume ?? ''
              )}
            >
              <InlineLink>{pvc?.volume}</InlineLink>
            </Link>
          </SidecarItem>
          <SidecarItem heading="Storage class">
            <Link
              to={getResourceDetailsAbsPath(
                cluster?.id,
                'storageclass',
                pvc?.storageClass ?? ''
              )}
            >
              <InlineLink>{pvc?.storageClass}</InlineLink>
            </Link>
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
