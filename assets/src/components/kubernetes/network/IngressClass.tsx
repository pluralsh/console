import { ReactElement, useMemo } from 'react'
import { SidecarItem, useSetBreadcrumbs } from '@pluralsh/design-system'
import { Outlet, useParams } from 'react-router-dom'

import {
  IngressClassQueryVariables,
  useIngressClassQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { MetadataSidecar } from '../common/utils'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'

import { useCluster } from '../Cluster'

import { Kind } from '../common/types'

import { getBreadcrumbs } from './IngressClasses'

const directory: Array<TabEntry> = [{ path: 'raw', label: 'Raw' }] as const

export default function IngressClass(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId, name = '' } = useParams()
  const { data, loading } = useIngressClassQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
    } as IngressClassQueryVariables,
  })

  const ic = data?.handleGetIngressClass

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

  if (loading) return <LoadingIndicator />

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
