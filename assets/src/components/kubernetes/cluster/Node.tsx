import React, { ReactElement, useMemo } from 'react'
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
  NodePodsQuery,
  NodePodsQueryVariables,
  NodeQueryVariables,
  Node_NodeDetail as NodeT,
  Pod_PodList as PodListT,
  Pod_Pod as PodT,
  useNodeEventsQuery,
  useNodePodsQuery,
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

import { GaugeWrap, ResourceGauge } from '../../cluster/Gauges'

import { usePodColumns } from '../workloads/Pods'

import { getBreadcrumbs } from './Nodes'
import { useEventsColumns } from './Events'
import { NodeReadyChip } from './utils'

const directory: Array<TabEntry> = [
  { path: '', label: 'Info' },
  { path: 'pods', label: 'Pods' },
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
    <>
      <section>
        <SubTitle>Allocated resources</SubTitle>
        <Card>
          <GaugeWrap
            heading="Memory reservation"
            width="auto"
            height="auto"
          >
            <ResourceGauge
              limits={node.allocatedResources.memoryLimits}
              requests={node.allocatedResources.memoryRequests}
              total={node.allocatedResources.memoryCapacity}
              type="memory"
            />
          </GaugeWrap>
          TODO
        </Card>
      </section>
      <section>
        <SubTitle>Node information</SubTitle>
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
          <ResourceInfoCardEntry heading="Machine ID">
            {node?.nodeInfo.machineID}
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="System UUID">
            {node?.nodeInfo.systemUUID}
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="Boot ID">
            {node?.nodeInfo.bootID}
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="Kernel version">
            {node?.nodeInfo.kernelVersion}
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="OS image">
            {node?.nodeInfo.osImage}
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="Container runtime version">
            {node?.nodeInfo.containerRuntimeVersion}
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="kubelet version">
            {node?.nodeInfo.kubeletVersion}
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="kube-proxy version">
            {node?.nodeInfo.kubeProxyVersion}
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="Operating system">
            {node?.nodeInfo.operatingSystem}
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="Architecture">
            {node?.nodeInfo.architecture}
          </ResourceInfoCardEntry>
        </Card>
      </section>
    </>
  )
}

export function NodePods(): ReactElement {
  const { name } = useParams()
  const columns = usePodColumns()

  // TODO: Pagination etc.
  return (
    <ResourceList<PodListT, PodT, NodePodsQuery, NodePodsQueryVariables>
      namespaced
      columns={columns}
      query={useNodePodsQuery}
      queryOptions={{
        variables: { name } as NodePodsQueryVariables,
      }}
      queryName="handleGetNodePods"
      itemsKey="pods"
      disableOnRowClick
    />
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
