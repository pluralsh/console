import { ReactElement, useMemo } from 'react'
import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'

import {
  ConfigMapQueryVariables,
  Persistentvolume_PersistentVolumeDetail as PersistentVolumeT,
  usePersistentVolumeQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { SubTitle } from '../../cluster/nodes/SubTitle'
import { MetadataSidecar, useKubernetesCluster } from '../utils'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'

import ResourceDetails, { TabEntry } from '../ResourceDetails'

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

  if (loading) return <LoadingIndicator />

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={<MetadataSidecar objectMeta={pv?.objectMeta} />}
    >
      <Outlet context={pv} />
    </ResourceDetails>
  )
}

export function PersistentVolumeInfo(): ReactElement {
  const pv = useOutletContext() as PersistentVolumeT

  return <section>TODO</section>
}

export function PersistentVolumeRaw(): ReactElement {
  return <>raw</>
}
