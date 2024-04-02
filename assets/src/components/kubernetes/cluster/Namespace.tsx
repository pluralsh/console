import { ReactElement, useMemo } from 'react'
import { SidecarItem, useSetBreadcrumbs } from '@pluralsh/design-system'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'

import {
  Common_EventList as EventListT,
  Common_Event as EventT,
  NamespaceEventsQuery,
  NamespaceEventsQueryVariables,
  NamespaceQueryVariables,
  Namespace_Namespace as NamespaceT,
  useNamespaceEventsQuery,
  useNamespaceQuery,
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

export default function Namespace(): ReactElement {
  const cluster = useKubernetesCluster()
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

export function NamespaceInfo(): ReactElement {
  const namespace = useOutletContext() as NamespaceT

  return <section>TODO</section>
}

export function NamespaceEvents(): ReactElement {
  const { name } = useParams()

  return (
    <ResourceList<
      EventListT,
      EventT,
      NamespaceEventsQuery,
      NamespaceEventsQueryVariables
    >
      namespaced
      columns={COLUMNS}
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
