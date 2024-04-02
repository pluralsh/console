import { ReactElement, useMemo } from 'react'
import {
  Card,
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'

import { useTheme } from 'styled-components'

import {
  Common_EventList as EventListT,
  Common_Event as EventT,
  NodeEventsQuery,
  NodeEventsQueryVariables,
  NodeQueryVariables,
  Node_NodeDetail as NodeT,
  useNodeEventsQuery,
  useNodeQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { MetadataSidecar, useKubernetesCluster } from '../utils'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'

import ResourceDetails, { TabEntry } from '../ResourceDetails'

import { ResourceList } from '../ResourceList'

import { SubTitle } from '../../cluster/nodes/SubTitle'

import { ResourceInfoCardEntry } from '../common/ResourceInfoCard'

import { getBreadcrumbs } from './Nodes'
import { useEventsColumns } from './Events'
import { NodeReadyChip } from './utils'

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

  const node = data?.handleGetNodeDetail

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
        <MetadataSidecar resource={node}>
          <SidecarItem heading="Ready">
            {/* TODO: Fix on the API side? It works in the list view. */}
            <NodeReadyChip ready={node?.ready} />
          </SidecarItem>
          {/* TODO: Fix on the API side? */}
          <SidecarItem heading="Phase">{node?.phase}</SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={node} />
    </ResourceDetails>
  )
}

export function NodeInfo(): ReactElement {
  const theme = useTheme()
  const node = useOutletContext() as NodeT

  return (
    <section>
      <SubTitle>Info</SubTitle>
      <Card
        css={{
          display: 'flex',
          gap: theme.spacing.large,
          padding: theme.spacing.medium,
        }}
      >
        <ResourceInfoCardEntry heading="Provider ID">
          {node?.providerID}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Unschedulable">
          {node?.unschedulable ? 'True' : 'False'}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Pod CIDR">
          {node?.podCIDR}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Addresses">
          <ChipList
            size="small"
            limit={5}
            values={node.addresses || []}
            transformValue={(a) => `${a?.type}: ${a?.address}`}
            emptyState={<div>None</div>}
          />
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Taints">
          <ChipList
            size="small"
            limit={5}
            values={node.taints || []}
            transformValue={(t) => `${t?.key}=${t?.value}:${t?.effect}`}
            emptyState={<div>None</div>}
          />
        </ResourceInfoCardEntry>
      </Card>
    </section>
  )
}

export function NodeEvents(): ReactElement {
  const { name } = useParams()
  const columns = useEventsColumns()

  return (
    <ResourceList<EventListT, EventT, NodeEventsQuery, NodeEventsQueryVariables>
      namespaced
      columns={columns}
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
