import { SidecarItem, useSetBreadcrumbs } from '@pluralsh/design-system'
import { ReactElement, useMemo } from 'react'
import { Link, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AxiosInstance } from '../../../helpers/axios.ts'

import { getClusterRoleBindingOptions } from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { GqlError } from '../../utils/Alert'
import { useCluster } from '../Cluster'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import Subjects from '../common/Subjects'
import { Kind } from '../common/types'
import { MetadataSidecar } from '../common/utils'

import { useTheme } from 'styled-components'
import { getBreadcrumbs } from './ClusterRoleBindings'
import { ClusterrolebindingClusterRoleBindingDetail } from 'generated/kubernetes/types.gen.ts'

const directory: Array<TabEntry> = [
  { path: '', label: 'Subjects' },
  { path: 'raw', label: 'Raw' },
] as const

export default function ClusterRoleBinding() {
  const theme = useTheme()
  const cluster = useCluster()
  const { clusterId = '', name = '' } = useParams()
  const {
    data: crb,
    isFetching,
    error,
  } = useQuery({
    ...getClusterRoleBindingOptions({
      client: AxiosInstance(clusterId),
      path: { name },
    }),
    refetchInterval: 30_000,
  })

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

  if (error) {
    return <GqlError error={error} />
  }

  if (isFetching) {
    return <LoadingIndicator />
  }

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
  const crb = useOutletContext() as ClusterrolebindingClusterRoleBindingDetail

  return <Subjects subjects={crb?.subjects} />
}
