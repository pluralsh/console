import { ReactElement, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { useQuery } from '@tanstack/react-query'
import { AxiosInstance } from '../../../helpers/axios.ts'

import { getClusterRoleOptions } from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import { MetadataSidecar } from '../common/utils'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { GqlError } from '../../utils/Alert'
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
  const { clusterId = '', name = '' } = useParams()
  const {
    data: cr,
    isFetching,
    error,
  } = useQuery({
    ...getClusterRoleOptions({
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
          url: getResourceDetailsAbsPath(clusterId, Kind.ClusterRole, name),
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
      sidecar={<MetadataSidecar resource={cr} />}
    >
      <Outlet context={cr} />
    </ResourceDetails>
  )
}
