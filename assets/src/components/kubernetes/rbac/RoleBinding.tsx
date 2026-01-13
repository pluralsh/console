import { ReactElement, useMemo } from 'react'
import { Link, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { SidecarItem, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useQuery } from '@tanstack/react-query'
import { AxiosInstance } from '../../../helpers/axios.ts'

import { getRoleBindingOptions } from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import { MetadataSidecar } from '../common/utils'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import {
  ROLE_BINDINGS_REL_PATH,
  getRbacAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { NAMESPACE_PARAM } from '../Navigation'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { GqlError } from '../../utils/Alert'
import Subjects from '../common/Subjects'

import { useCluster } from '../Cluster'

import { Kind } from '../common/types'

import { getBreadcrumbs } from './RoleBindings'
import { useTheme } from 'styled-components'
import { RolebindingRoleBindingDetail } from 'generated/kubernetes/types.gen.ts'

const directory: Array<TabEntry> = [
  { path: '', label: 'Subjects' },
  { path: 'raw', label: 'Raw' },
] as const

export default function RoleBinding() {
  const theme = useTheme()
  const cluster = useCluster()
  const { clusterId = '', name = '', namespace = '' } = useParams()
  const {
    data: rb,
    isLoading,
    error,
  } = useQuery({
    ...getRoleBindingOptions({
      client: AxiosInstance(clusterId),
      path: { name, namespace },
    }),
    refetchInterval: 30_000,
  })

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: namespace ?? '',
          url: `${getRbacAbsPath(
            cluster?.id
          )}/${ROLE_BINDINGS_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(
            clusterId,
            Kind.RoleBinding,
            name,
            namespace
          ),
        },
      ],
      [cluster, clusterId, name, namespace]
    )
  )

  if (error) {
    return <GqlError error={error} />
  }

  if (isLoading) {
    return <LoadingIndicator />
  }

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={
        <MetadataSidecar resource={rb}>
          <SidecarItem heading="Role">
            <Link
              css={theme.partials.text.inlineLink}
              to={getResourceDetailsAbsPath(
                clusterId,
                Kind.Role,
                rb?.roleRef.name ?? '',
                namespace
              )}
            >
              {rb?.roleRef.name}
            </Link>
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={rb} />
    </ResourceDetails>
  )
}

// TODO: Add links.
export function RoleBindingSubjects(): ReactElement<any> {
  const rb = useOutletContext() as RolebindingRoleBindingDetail

  return <Subjects subjects={rb?.subjects} />
}
