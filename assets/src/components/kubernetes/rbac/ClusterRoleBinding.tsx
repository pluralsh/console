import { SidecarItem, useSetBreadcrumbs } from '@pluralsh/design-system'
import { ReactElement, useMemo } from 'react'
import { Link, Outlet, useOutletContext, useParams } from 'react-router-dom'

import {
  ClusterRoleBindingQueryVariables,
  Clusterrolebinding_ClusterRoleBindingDetail as ClusterRoleBindingT,
  useClusterRoleBindingQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { useCluster } from '../Cluster'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import Subjects from '../common/Subjects'
import { Kind } from '../common/types'
import { MetadataSidecar } from '../common/utils'

import { useTheme } from 'styled-components'
import { getBreadcrumbs } from './ClusterRoleBindings'

const directory: Array<TabEntry> = [
  { path: '', label: 'Subjects' },
  { path: 'raw', label: 'Raw' },
] as const

export default function ClusterRoleBinding() {
  const theme = useTheme()
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
            <Link
              css={theme.partials.text.inlineLink}
              to={getResourceDetailsAbsPath(
                clusterId,
                Kind.ClusterRole,
                crb?.roleRef.name ?? ''
              )}
            >
              {crb?.roleRef.name}
            </Link>
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

  return <Subjects subjects={crb?.subjects} />
}
