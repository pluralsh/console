import { ReactElement, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { KubernetesClient } from '../../../helpers/kubernetes.client'
import {
  ClusterRoleQueryVariables,
  useClusterRoleQuery,
} from '../../../generated/graphql-kubernetes'
import { MetadataSidecar } from '../common/utils'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { useCluster } from '../Cluster'
import { Kind } from '../common/types'

import { getBreadcrumbs } from './ClusterRoles'

const directory: Array<TabEntry> = [
  { path: '', label: 'Policy rules' },
  { path: 'raw', label: 'Raw' },
] as const

export default function ClusterRole(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId, name = '' } = useParams()
  const { data, loading } = useClusterRoleQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
    } as ClusterRoleQueryVariables,
  })

  const cr = data?.handleGetClusterRoleDetail

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),

        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(clusterId, Kind.ClusterRole, name),
        },
      ],
      [cluster, clusterId, name]
    )
  )

  if (loading) return <LoadingIndicator />

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={<MetadataSidecar resource={cr} />}
    >
      <Outlet context={cr} />
    </ResourceDetails>
  )
}
