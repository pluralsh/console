import { ReactElement, useMemo } from 'react'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { MetadataSidecar } from '../common/utils'
import {
  RoleQueryVariables,
  Role_RoleDetail as RoleT,
  useRoleQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import {
  ROLES_REL_PATH,
  getRbacAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { NAMESPACE_PARAM } from '../Navigation'
import LoadingIndicator from '../../utils/LoadingIndicator'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import PolicyRules from '../common/PolicyRules'
import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'
import { useCluster } from '../Cluster'
import { Kind } from '../common/types'

import { getBreadcrumbs } from './Roles'

const directory: Array<TabEntry> = [
  { path: '', label: 'Policy rules' },
  { path: 'raw', label: 'Raw' },
] as const

export default function Role(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId, name = '', namespace = '' } = useParams()
  const { data, loading } = useRoleQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: { name, namespace } as RoleQueryVariables,
  })

  const role = data?.handleGetRoleDetail

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: namespace ?? '',
          url: `${getRbacAbsPath(
            cluster?.id
          )}/${ROLES_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(clusterId, Kind.Role, name, namespace),
        },
      ],
      [cluster, clusterId, name, namespace]
    )
  )

  if (loading) return <LoadingIndicator />

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={<MetadataSidecar resource={role} />}
    >
      <Outlet context={role} />
    </ResourceDetails>
  )
}

export function RolePolicyRules(): ReactElement<any> {
  const role = useOutletContext() as RoleT

  return (
    <FullHeightTableWrap>
      <PolicyRules rules={role.rules} />
    </FullHeightTableWrap>
  )
}
