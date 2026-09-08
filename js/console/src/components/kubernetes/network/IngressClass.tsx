import { ReactElement, useMemo } from 'react'
import { SidecarItem, useSetBreadcrumbs } from '@pluralsh/design-system'
import { Outlet, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AxiosInstance } from '../../../helpers/axios.ts'

import { getIngressClassOptions } from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { GqlError } from '../../utils/Alert'
import { MetadataSidecar } from '../common/utils'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'

import { useCluster } from '../Cluster'

import { Kind } from '../common/types'

import { getBreadcrumbs } from './IngressClasses'

const directory: Array<TabEntry> = [{ path: 'raw', label: 'Raw' }] as const

export default function IngressClass(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId = '', name = '' } = useParams()
  const {
    data: ic,
    isLoading,
    error,
  } = useQuery({
    ...getIngressClassOptions({
      client: AxiosInstance(clusterId),
      path: { ingressclass: name },
    }),
    refetchInterval: 30_000,
  })

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(clusterId, Kind.IngressClass, name),
        },
      ],
      [cluster, clusterId, name]
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
        <MetadataSidecar resource={ic}>
          <SidecarItem heading="Controller">{ic?.controller}</SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={ic} />
    </ResourceDetails>
  )
}
