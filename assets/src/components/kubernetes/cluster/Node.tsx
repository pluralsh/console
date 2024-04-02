import { ReactElement, useMemo } from 'react'
import { SidecarItem, useSetBreadcrumbs } from '@pluralsh/design-system'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'

import {
  Common_EventList as EventListT,
  Common_Event as EventT,
  NodeEventsQuery,
  NodeEventsQueryVariables,
  NodeQueryVariables,
  Node_Node as NodeT,
  useNodeEventsQuery,
  useNodeQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { MetadataSidecar, useKubernetesCluster } from '../utils'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'

import ResourceDetails, { TabEntry } from '../ResourceDetails'

import { ResourceList } from '../ResourceList'

import { getBreadcrumbs } from './Namespaces'
import { NamespacePhaseChip } from './utils'
import { COLUMNS } from './Events'

const directory: Array<TabEntry> = [
  { path: '', label: 'Info' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function Node(): ReactElement {
  const cluster = useKubernetesCluster()
  const { clusterId, name = '' } = useParams()
  const { data, loading } = useNodeQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
    } as NodeQueryVariables,
  })

  const namespace = data?.handleGetNodeDetail

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(clusterId, 'namespace', name),
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

export function NodeInfo(): ReactElement {
  const node = useOutletContext() as NodeT

  return <section>TODO</section>
}

export function NodeEvents(): ReactElement {
  const { name } = useParams()

  return (
    <ResourceList<EventListT, EventT, NodeEventsQuery, NodeEventsQueryVariables>
      namespaced
      columns={COLUMNS}
      query={useNodeEventsQuery}
      queryOptions={{
        variables: { name } as NodeEventsQueryVariables,
      }}
      queryName="handleGetNodeEvents"
      itemsKey="events"
      disableOnRowClick
    />
  )
}
