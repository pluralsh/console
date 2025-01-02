import { ReactElement, useMemo } from 'react'
import { Link, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { SidecarItem, useSetBreadcrumbs } from '@pluralsh/design-system'
import { A } from 'honorable'

import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { MetadataSidecar } from '../common/utils'
import {
  ClusterRoleBindingQueryVariables,
  Clusterrolebinding_ClusterRoleBindingDetail as ClusterRoleBindingT,
  useClusterRoleBindingQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'
import Subjects from '../common/Subjects'
import { useCluster } from '../Cluster'
import { Kind } from '../common/types'

import { getBreadcrumbs } from './ClusterRoleBindings'

const directory: Array<TabEntry> = [
  { path: '', label: 'Subjects' },
  { path: 'raw', label: 'Raw' },
] as const

export default function ClusterRoleBinding(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId, name = '' } = useParams()
  const { data, loading } = useClusterRoleBindingQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
    } as ClusterRoleBindingQueryVariables,
  })

  const crb = data?.handleGetClusterRoleBindingDetail

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(
            clusterId,
            Kind.ClusterRoleBinding,
            name
          ),
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
        <MetadataSidecar resource={crb}>
          <SidecarItem heading="Role">
            <A
              as={Link}
              to={getResourceDetailsAbsPath(
                clusterId,
                Kind.ClusterRole,
                crb?.roleRef.name ?? ''
              )}
              inline
            >
              {crb?.roleRef.name}
            </A>
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={crb} />
    </ResourceDetails>
  )
}

// TODO: Add links.
export function ClusterRoleBindingSubjects(): ReactElement<any> {
  const crb = useOutletContext() as ClusterRoleBindingT

  return (
    <FullHeightTableWrap>
      <Subjects subjects={crb?.subjects} />
    </FullHeightTableWrap>
  )
}
