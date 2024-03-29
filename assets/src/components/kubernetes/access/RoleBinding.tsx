import { ReactElement, useMemo } from 'react'
import { Link, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { SidecarItem, useSetBreadcrumbs } from '@pluralsh/design-system'
import { A } from 'honorable'

import {
  RoleBindingQueryVariables,
  Rolebinding_RoleBindingDetail as RoleBindingT,
  useRoleBindingQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import { MetadataSidecar, useKubernetesCluster } from '../utils'
import ResourceDetails, { TabEntry } from '../ResourceDetails'
import {
  ROLES_REL_PATH,
  getAccessAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { NAMESPACE_PARAM } from '../Kubernetes'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'
import Subjects from '../common/Subjects'

import { getBreadcrumbs } from './Roles'

const directory: Array<TabEntry> = [
  { path: '', label: 'Subjects' },
  { path: 'raw', label: 'Raw' },
] as const

export default function RoleBinding(): ReactElement {
  const cluster = useKubernetesCluster()
  const { clusterId, name = '', namespace = '' } = useParams()
  const { data, loading } = useRoleBindingQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
      namespace,
    } as RoleBindingQueryVariables,
  })

  const rb = data?.handleGetRoleBindingDetail

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: namespace ?? '',
          url: `${getAccessAbsPath(
            cluster?.id
          )}/${ROLES_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(
            clusterId,
            'rolebinding',
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
        <MetadataSidecar objectMeta={rb?.objectMeta}>
          <SidecarItem heading="Role">
            <A
              as={Link}
              to={getResourceDetailsAbsPath(
                clusterId,
                'role',
                rb?.roleRef.name ?? '',
                namespace
              )}
              inline
            >
              {rb?.roleRef.name}
            </A>
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={rb} />
    </ResourceDetails>
  )
}

// TODO: Add links.
export function RoleBindingSubjects(): ReactElement {
  const rb = useOutletContext() as RoleBindingT

  return (
    <FullHeightTableWrap>
      <Subjects subjects={rb?.subjects} />
    </FullHeightTableWrap>
  )
}
