import {
  Button,
  Card,
  Chip,
  ChipList,
  Flex,
  SidecarItem,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'

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

import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import { GaugeWrap } from '../../cluster/Gauges'
import { cpuFmt, roundToTwoPlaces } from '../../cluster/utils'
import RadialBarChart from '../../utils/RadialBarChart'
import { SubTitle } from '../../utils/SubTitle'
import Conditions from '../common/Conditions'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { ResourceInfoCardEntry } from '../common/ResourceInfoCard'
import { ResourceList } from '../common/ResourceList'
import { usePodsColumns } from '../workloads/Pods'

import { useCluster } from '../Cluster'

import { MetadataSidecar, ResourceReadyChip } from '../common/utils'

import { Kind } from '../common/types'

import { filesize } from 'filesize'
import { useMemo, useState } from 'react'
import { useEventsColumns } from './Events'
import { getBreadcrumbs } from './Nodes'
import { DrainNodeModal } from '../common/DrainNodeModal.tsx'

const directory: Array<TabEntry> = [
  { path: '', label: 'Info' },
  { path: 'conditions', label: 'Conditions' },
  { path: 'images', label: 'Container images' },
  { path: 'pods', label: 'Pods' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function Node() {
  const cluster = useCluster()
  const { clusterId, name = '' } = useParams()
  const [open, setOpen] = useState(false)

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
        <Flex
          direction={'column'}
          gap={'medium'}
        >
          <Button
            destructive
            onClick={(e) => {
              e.stopPropagation()
              setOpen(true)
            }}
          >
            Drain node
          </Button>
          <DrainNodeModal
            name={name}
            open={open}
            setOpen={setOpen}
          />
          <MetadataSidecar resource={node}>
            <SidecarItem heading="Ready">
              {/* TODO: Fix on the API side? It works in the list view. */}
              <ResourceReadyChip ready={node?.ready} />
            </SidecarItem>
            <SidecarItem heading="Unschedulable">
              <Chip
                size="small"
                severity={node?.unschedulable ? 'danger' : 'success'}
              >
                {node?.unschedulable ? 'True' : 'False'}
              </Chip>
            </SidecarItem>
            {node.podCIDR && (
              <SidecarItem heading="Pod CIDR">{node?.podCIDR}</SidecarItem>
            )}
          </MetadataSidecar>
        </Flex>
      }
    >
      <Outlet context={node} />
    </ResourceDetails>
  )
}

export function NodeInfo() {
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
              emptyState={<div>-</div>}
            />
          </ResourceInfoCardEntry>
          <ResourceInfoCardEntry heading="Addresses">
            <ChipList
              size="small"
              limit={5}
              values={node.addresses || []}
              transformValue={(a) => `${a?.type}: ${a?.address}`}
              emptyState={<div>-</div>}
            />
          </ResourceInfoCardEntry>
        </Card>
      </section>
    </>
  )
}

export function NodeConditions() {
  const node = useOutletContext() as NodeT

  return <Conditions conditions={node.conditions} />
}

const columnHelper = createColumnHelper<string>()

const columns = [
  columnHelper.accessor((image) => image, {
    id: 'image',
    header: 'Image',
    cell: ({ getValue }) => getValue(),
  }),
]

export function NodeContainerImages() {
  const node = useOutletContext() as NodeT

  return (
    <Table
      fullHeightWrap
      data={node.containerImages}
      columns={columns}
    />
  )
}
export function NodePods() {
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
    />
  )
}

export function NodeEvents() {
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
