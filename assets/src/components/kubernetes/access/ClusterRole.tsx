import { ReactElement, useMemo } from 'react'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { KubernetesClient } from '../../../helpers/kubernetes.client'
import {
  ClusterRoleQueryVariables,
  Clusterrole_ClusterRoleDetail as ClusterRoleT,
  useClusterRoleQuery,
} from '../../../generated/graphql-kubernetes'
import { MetadataSidecar } from '../common/utils'

import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import PolicyRules from '../common/PolicyRules'

import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'

import { useCluster } from '../Cluster'

import { getBreadcrumbs } from './ClusterRoles'

const directory: Array<TabEntry> = [
  { path: '', label: 'Policy rules' },
  { path: 'raw', label: 'Raw' },
] as const

export default function ClusterRole(): ReactElement {
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
          url: getResourceDetailsAbsPath(clusterId, 'clusterrole', name),
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

export function RolePolicyRules(): ReactElement {
  const cr = useOutletContext() as ClusterRoleT

  return (
    <FullHeightTableWrap>
      <PolicyRules rules={cr.rules} />
    </FullHeightTableWrap>
  )
}
