import {
  Card,
  EmptyState,
  Flex,
  Input,
  ListBoxItem,
  NamespaceIcon,
  SearchIcon,
  Select,
} from '@pluralsh/design-system'
import { Node, ReactFlowProvider, useReactFlow } from '@xyflow/react'
import { DELIMITER } from 'components/ai/insights/InsightEvidence'
import { useThrottle } from 'components/hooks/useThrottle'
import { NamespaceFilter } from 'components/kubernetes/common/NamespaceFilter'
import Fuse from 'fuse.js'
import {
  NetworkMeshEdgeFragment,
  NetworkMeshStatisticsFragment,
  NetworkMeshWorkloadFragment,
  useClusterNamespacesQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { ComponentProps, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import LoadingIndicator from '../LoadingIndicator'
import { Edge, EdgeType } from '../reactflow/edges'
import { ReactFlowGraph } from '../reactflow/ReactFlowGraph'
import { TimestampSliderButton } from '../TimestampSlider'
import { MeshWorkloadNode } from './NetworkGraphNodes'
import { NetworkGraphStatistics } from './NetworkGraphStatistics'

const nodeTypes = { workload: MeshWorkloadNode }
export type NetworkEdgeData = {
  statsArr: {
    from: NetworkMeshWorkloadFragment
    to: NetworkMeshWorkloadFragment
    stats: NetworkMeshStatisticsFragment
  }[]
}

const searchOptions: Fuse.IFuseOptions<NetworkMeshEdgeFragment> = {
  keys: ['from.name', 'from.service', 'to.name', 'to.service'],
  threshold: 0.25,
  ignoreLocation: true,
}

type TrafficType = 'internal-only' | 'all'

export function NetworkGraph(
  props: ComponentProps<typeof NetworkGraphInternal>
) {
  return (
    <ReactFlowProvider>
      <NetworkGraphInternal {...props} />
    </ReactFlowProvider>
  )
}

function NetworkGraphInternal({
  networkData,
  loading,
  setTimestamp,
  isTimestampSet,
  enableNamespaceFilter = true,
}: {
  networkData: Nullable<NetworkMeshEdgeFragment>[]
  loading?: boolean
  setTimestamp: (timestamp: string | undefined) => void
  isTimestampSet: boolean
  enableNamespaceFilter?: boolean
}) {
  const { colors } = useTheme()
  const { clusterId } = useParams()
  const [q, setQ] = useState('')
  const throttledQ = useThrottle(q, 500)
  const [namespace, setNamespace] = useState<string | undefined>(undefined)
  const [traffic, setTraffic] = useState<TrafficType>('internal-only')
  const [selectedEdge, setSelectedEdge] =
    useState<Nullable<Edge<NetworkEdgeData>>>()

  const { updateEdge } = useReactFlow()

  const { data: namespacesData, error: namespacesError } =
    useClusterNamespacesQuery({
      variables: { clusterId },
      skip: !enableNamespaceFilter,
    })
  const namespaces =
    namespacesData?.namespaces
      ?.filter(isNonNullable)
      .map((ns) => ns.metadata.name) ?? []

  const { nodes: baseNodes, edges: baseEdges } = useMemo(() => {
    let filteredData =
      networkData
        ?.filter(isNonNullable)
        .filter(
          (edge) =>
            !namespace ||
            edge.from.namespace === namespace ||
            edge.to.namespace === namespace
        )
        .filter((edge) =>
          traffic === 'internal-only'
            ? !!edge.from.namespace && !!edge.to.namespace
            : true
        ) ?? []

    if (throttledQ)
      filteredData = new Fuse(filteredData, searchOptions)
        .search(throttledQ)
        .map(({ item }) => item)

    return getNetworkNodesAndEdges(filteredData)
  }, [namespace, networkData, throttledQ, traffic])

  return (
    <WrapperSC>
      <Flex
        gap="medium"
        width="100%"
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search service names"
          startIcon={<SearchIcon color="icon-light" />}
          flex={1}
        />
        {enableNamespaceFilter && !namespacesError && (
          <NamespaceFilter
            namespaces={namespaces}
            namespace={namespace ?? ''}
            onChange={setNamespace}
            startIcon={<NamespaceIcon color="icon-light" />}
            inputProps={{ placeholder: 'Filter by namespace' }}
            containerProps={{
              style: { background: colors['fill-one'], flex: 1 },
            }}
          />
        )}
        <Select
          width={200}
          selectedKey={traffic}
          onSelectionChange={(key) => setTraffic(key as TrafficType)}
        >
          <ListBoxItem
            key="internal-only"
            label="Internal traffic only"
          />
          <ListBoxItem
            key="all"
            label="All traffic"
          />
        </Select>
        <TimestampSliderButton
          setTimestamp={setTimestamp}
          isTimestampSet={isTimestampSet}
        />
      </Flex>
      <Card flex={1}>
        {isEmpty(networkData) ? (
          loading ? (
            <LoadingIndicator />
          ) : (
            <EmptyState message="No network data found." />
          )
        ) : (
          <ReactFlowGraph
            allowFullscreen
            baseNodes={baseNodes}
            baseEdges={baseEdges}
            elkOptions={elkOptions}
            nodeTypes={nodeTypes}
            minZoom={0.03}
            nodeDragThreshold={5}
            showLayoutingIndicator={false}
            onEdgeMouseEnter={(_, { id }) =>
              updateEdge(id, { style: { stroke: colors['text-light'] } })
            }
            onEdgeMouseLeave={(_, { id }) =>
              updateEdge(id, { style: { stroke: colors.border } })
            }
            onSelectionChange={({ edges }) =>
              setSelectedEdge(edges[0] as Nullable<Edge<NetworkEdgeData>>)
            }
            edgesSelectable
            edgesFocusable
            additionalOverlays={
              selectedEdge && (
                <NetworkGraphStatistics selectedEdge={selectedEdge} />
              )
            }
          />
        )}
      </Card>
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  height: '100%',
  width: '100%',
}))

function getNetworkNodesAndEdges(networkData: NetworkMeshEdgeFragment[]): {
  nodes: Node[]
  edges: Edge<NetworkEdgeData>[]
} {
  const nodes: Node[] = []
  const edges: Edge<NetworkEdgeData>[] = []
  const workloadMap: Record<string, NetworkMeshWorkloadFragment> = {}
  const edgeDataMap: Record<string, NetworkEdgeData> = {}

  networkData.forEach((networkEdge) => {
    const sourceId = networkEdge.from.id
    const targetId = networkEdge.to.id

    const edgeKey = [sourceId, targetId].sort().join(DELIMITER)
    if (!edgeDataMap[edgeKey]?.statsArr) edgeDataMap[edgeKey] = { statsArr: [] }

    workloadMap[sourceId] = networkEdge.from
    workloadMap[targetId] = networkEdge.to

    edgeDataMap[edgeKey]?.statsArr?.push({
      from: networkEdge.from,
      to: networkEdge.to,
      stats: networkEdge.statistics,
    })
  })

  Object.values(workloadMap).forEach((workload) => {
    nodes.push({
      id: workload.id,
      position: { x: 0, y: 0 },
      type: 'workload',
      data: workload,
    })
  })

  // only need the source and target id for the first object in statsArr
  // if it's bidirectional then the UI will handle that automatically
  Object.values(edgeDataMap).forEach(({ statsArr }) => {
    const edgeData = statsArr[0]
    if (!edgeData) return
    edges.push({
      id: `${edgeData.from.id}-${edgeData.to.id}`,
      source: edgeData.from.id,
      target: edgeData.to.id,
      type: EdgeType.Network,
      data: { statsArr },
    })
  })

  return { nodes, edges }
}

const elkOptions = {
  'elk.algorithm': 'force',
  'elk.spacing.nodeNode': '5',
}
