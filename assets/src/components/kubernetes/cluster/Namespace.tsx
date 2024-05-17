import { ReactElement, useMemo } from 'react'
import { SidecarItem, useSetBreadcrumbs } from '@pluralsh/design-system'
import { Outlet, useParams } from 'react-router-dom'

import {
  Common_EventList as EventListT,
  Common_Event as EventT,
  NamespaceEventsQuery,
  NamespaceEventsQueryVariables,
  NamespaceQueryVariables,
  useNamespaceEventsQuery,
  useNamespaceQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { MetadataSidecar } from '../common/utils'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { ResourceList } from '../common/ResourceList'
import { useCluster } from '../Cluster'

import { Kind } from '../common/types'

import { getBreadcrumbs } from './Namespaces'
import { NamespacePhaseChip } from './utils'
import { useEventsColumns } from './Events'

const directory: Array<TabEntry> = [
  { path: 'raw', label: 'Raw' },
  { path: 'events', label: 'Events' },
] as const

export default function Namespace(): ReactElement {
  const cluster = useCluster()
  const { clusterId, name = '' } = useParams()
  const { data, loading } = useNamespaceQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
    } as NamespaceQueryVariables,
  })

  const namespace = data?.handleGetNamespaceDetail

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(clusterId, Kind.Namespace, name),
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
        <MetadataSidecar resource={namespace}>
          <SidecarItem heading="Phase">
            <NamespacePhaseChip phase={namespace?.phase} />
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={namespace} />
    </ResourceDetails>
  )
}

export function NamespaceEvents(): ReactElement {
  const { name } = useParams()
  const columns = useEventsColumns()

  return (
    <ResourceList<
      EventListT,
      EventT,
      NamespaceEventsQuery,
      NamespaceEventsQueryVariables
    >
      namespaced
      columns={columns}
      query={useNamespaceEventsQuery}
      queryOptions={{
        variables: { name } as NamespaceEventsQueryVariables,
      }}
      queryName="handleGetNamespaceEvents"
      itemsKey="events"
      disableOnRowClick
    />
  )
}
