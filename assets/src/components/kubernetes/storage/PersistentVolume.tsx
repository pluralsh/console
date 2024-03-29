import { ReactElement, useMemo } from 'react'
import {
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { Link, Outlet, useOutletContext, useParams } from 'react-router-dom'

import {
  ConfigMapQueryVariables,
  Persistentvolume_PersistentVolumeDetail as PersistentVolumeT,
  usePersistentVolumeQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { MetadataSidecar, useKubernetesCluster } from '../utils'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'

import ResourceDetails, { TabEntry } from '../ResourceDetails'

import { InlineLink } from '../../utils/typography/InlineLink'

import { getBreadcrumbs } from './PersistentVolumes'
import { PVStatusChip } from './utils'

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
        <MetadataSidecar objectMeta={pv?.objectMeta}>
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
        </MetadataSidecar>
      }
    >
      <Outlet context={pv} />
    </ResourceDetails>
  )
}

export function PersistentVolumeInfo(): ReactElement {
  const pv = useOutletContext() as PersistentVolumeT

  return <section>TODO</section>
}
