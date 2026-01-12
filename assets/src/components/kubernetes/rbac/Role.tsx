import { ReactElement, useMemo } from 'react'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { useQuery } from '@tanstack/react-query'
import { AxiosInstance } from '../../../helpers/axios.ts'

import { MetadataSidecar } from '../common/utils'
import { getRoleOptions } from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import {
  ROLES_REL_PATH,
  getRbacAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { NAMESPACE_PARAM } from '../Navigation'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { GqlError } from '../../utils/Alert'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import PolicyRules from '../common/PolicyRules'
import { useCluster } from '../Cluster'
import { Kind } from '../common/types'

import { getBreadcrumbs } from './Roles'
import { RoleRoleDetail } from 'generated/kubernetes/types.gen.ts'

const directory: Array<TabEntry> = [
  { path: '', label: 'Policy rules' },
  { path: 'raw', label: 'Raw' },
] as const

export default function Role(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId = '', name = '', namespace = '' } = useParams()
  const {
    data: role,
    isFetching,
    error,
  } = useQuery({
    ...getRoleOptions({
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

  if (error) {
    return <GqlError error={error} />
  }

  if (isFetching) {
    return <LoadingIndicator />
  }

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
  const role = useOutletContext() as RoleRoleDetail

  return <PolicyRules rules={role.rules} />
}
