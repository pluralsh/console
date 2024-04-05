import React, { ReactElement, useMemo } from 'react'
import {
  Card,
  ChipList,
  SidecarItem,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { filesize } from 'filesize'
import { createColumnHelper } from '@tanstack/react-table'

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
import {
  MetadataSidecar,
  ResourceReadyChip,
  useKubernetesCluster,
} from '../utils'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import ResourceDetails, { TabEntry } from '../ResourceDetails'
import { ResourceList } from '../ResourceList'
import { SubTitle } from '../../utils/SubTitle'
import { ResourceInfoCardEntry } from '../common/ResourceInfoCard'
import { GaugeWrap } from '../../cluster/Gauges'
import { usePodsColumns } from '../workloads/Pods'
import Conditions from '../common/Conditions'
import RadialBarChart from '../../utils/RadialBarChart'
import { cpuFmt, roundToTwoPlaces } from '../../cluster/utils'
import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'

import { getBreadcrumbs } from './Nodes'
import { useEventsColumns } from './Events'

const directory: Array<TabEntry> = [
  { path: '', label: 'Info' },
  { path: 'conditions', label: 'Conditions' },
  { path: 'images', label: 'Container images' },
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

  const node = data?.handleGetNodeDetail as NodeT

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
            <ResourceReadyChip ready={node?.ready} />
          </SidecarItem>
          <SidecarItem heading="Unschedulable">
            {node?.unschedulable ? 'True' : 'False'}
          </SidecarItem>
          <SidecarItem heading="Pod CIDR">{node?.podCIDR}</SidecarItem>
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

  const { memoryData, cpuData, podsData } = useMemo(() => {
    const {
      cpuRequests,
      cpuLimits,
      cpuCapacity,
      memoryRequests,
      memoryLimits,
      memoryCapacity,
      allocatedPods,
      podCapacity,
    } = node.allocatedResources

    return {
      cpuData: [
        { id: 'Capacity', data: [{ x: 'Capacity', y: cpuCapacity ?? 0 }] },
        { id: 'Limits', data: [{ x: 'Limits', y: cpuLimits ?? 0 }] },
        { id: 'Requests', data: [{ x: 'Requests', y: cpuRequests ?? 0 }] },
      ],
      memoryData: [
        { id: 'Capacity', data: [{ x: 'Capacity', y: memoryCapacity ?? 0 }] },
        { id: 'Limits', data: [{ x: 'Limits', y: memoryLimits ?? 0 }] },
        { id: 'Requests', data: [{ x: 'Requests', y: memoryRequests ?? 0 }] },
      ],
      podsData: [
        {
          id: 'Pod usage',
          data: [
            { x: 'Pods used', y: allocatedPods },
            { x: 'Pods available', y: podCapacity - allocatedPods },
          ],
        },
      ],
    }
  }, [node.allocatedResources])

  return (
    <>
      <section>
        <SubTitle>Allocated resources</SubTitle>
        <Card
          css={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
            justifyContent: 'center',
            gap: theme.spacing.large,
            padding: theme.spacing.medium,
            flexWrap: 'wrap',
          }}
        >
          <GaugeWrap
            heading="CPU reservation"
            width="auto"
            height="auto"
          >
            <RadialBarChart
              data={cpuData}
              valueFormat={(val) =>
                cpuFmt(roundToTwoPlaces(val ?? 0 / 1000)) as string
              }
            />
          </GaugeWrap>
          <GaugeWrap
            heading="Memory reservation"
            width="auto"
            height="auto"
          >
            <RadialBarChart
              data={memoryData}
              valueFormat={(val) => filesize(roundToTwoPlaces(val)) as string}
            />
          </GaugeWrap>
          <GaugeWrap
            heading="Pods usage"
            width="auto"
            height="auto"
          >
            <RadialBarChart
              data={podsData}
              centerLabel="Used"
              centerVal={`${Math.round(node.allocatedResources.podFraction)}%`}
            />
          </GaugeWrap>
        </Card>
      </section>
      <section>
        <SubTitle>Node information</SubTitle>
        <Card
          css={{
            display: 'flex',
            gap: theme.spacing.large,
            padding: theme.spacing.medium,
            flexWrap: 'wrap',
          }}
        >
          <ResourceInfoCardEntry heading="Platform">
            {node?.nodeInfo.operatingSystem}/{node?.nodeInfo.architecture}
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="Kernel">
            v{node?.nodeInfo.kernelVersion}
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="Provider ID">
            {node?.providerID}
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="System image">
            {node?.nodeInfo.osImage}
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="Container runtime">
            {node?.nodeInfo.containerRuntimeVersion}
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="kubelet">
            {node?.nodeInfo.kubeletVersion}
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="kube-proxy">
            {node?.nodeInfo.kubeProxyVersion}
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
          <ResourceInfoCardEntry heading="Taints">
            <ChipList
              size="small"
              limit={5}
              values={node.taints || []}
              transformValue={(t) => `${t?.key}=${t?.value}:${t?.effect}`}
              emptyState={<div>None</div>}
            />
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
        </Card>
      </section>
    </>
  )
}

export function NodeConditions(): ReactElement {
  const node = useOutletContext() as NodeT

  return (
    <FullHeightTableWrap>
      <Conditions
        conditions={node.conditions}
        maxHeight="unset"
      />
    </FullHeightTableWrap>
  )
}

const columnHelper = createColumnHelper<string>()

const columns = [
  columnHelper.accessor((image) => image, {
    id: 'image',
    header: 'Image',
    cell: ({ getValue }) => getValue(),
  }),
]

export function NodeContainerImages(): ReactElement {
  const node = useOutletContext() as NodeT

  return (
    <FullHeightTableWrap>
      <Table
        data={node.containerImages}
        columns={columns}
        css={{
          maxHeight: 'unset',
          height: '100%',
        }}
      />
    </FullHeightTableWrap>
  )
}
export function NodePods(): ReactElement {
  const { name } = useParams()
  const columns = usePodsColumns()

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
