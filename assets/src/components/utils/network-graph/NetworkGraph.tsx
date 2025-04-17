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
import { Edge, Node, ReactFlowProvider } from '@xyflow/react'
import { DagreGraphOptions } from 'components/cd/pipelines/utils/nodeLayouter'
import { NamespaceFilter } from 'components/kubernetes/common/NamespaceFilter'
import {
  NetworkMeshEdgeFragment,
  NetworkMeshWorkloadFragment,
  useClusterNamespacesQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { createContext, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import LoadingIndicator from '../LoadingIndicator'
import { EdgeType } from '../reactflow/edges'
import { ReactFlowGraph } from '../reactflow/graph'
import { TimestampSliderButton } from '../TimestampSlider'
import { MeshStatisticsNode, MeshWorkloadNode } from './NetworkGraphNodes'
import { useThrottle } from 'components/hooks/useThrottle'
import Fuse from 'fuse.js'

const nodeTypes = {
  workload: MeshWorkloadNode,
  statistics: MeshStatisticsNode,
}

const searchOptions: Fuse.IFuseOptions<NetworkMeshEdgeFragment> = {
  keys: ['from.name', 'from.service', 'to.name', 'to.service'],
  threshold: 0.25,
  ignoreLocation: true,
}

type TrafficType = 'internal-only' | 'all'

export const ExpandedNetworkInfoCtx = createContext<{
  expandedId: string | undefined
  setExpandedId: (expandedId: string | undefined) => void
}>({
  expandedId: undefined,
  setExpandedId: () => {},
})

export function NetworkGraph({
  networkData,
  loading,
  setTimestamp,
  isTimestampSet,
}: {
  networkData: Nullable<NetworkMeshEdgeFragment>[]
  loading?: boolean
  setTimestamp: (timestamp: string | undefined) => void
  isTimestampSet: boolean
}) {
  const { colors } = useTheme()
  const { clusterId } = useParams()
  const [q, setQ] = useState('')
  const throttledQ = useThrottle(q, 500)
  const [namespace, setNamespace] = useState<string | undefined>(undefined)
  const [traffic, setTraffic] = useState<TrafficType>('internal-only')

  const [expandedId, setExpandedId] = useState<string | undefined>(undefined)
  const ctx = useMemo(() => ({ expandedId, setExpandedId }), [expandedId])

  const { data: namespacesData, error: namespacesError } =
    useClusterNamespacesQuery({
      variables: { clusterId },
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
    <ExpandedNetworkInfoCtx value={ctx}>
      <ReactFlowProvider>
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
            {!namespacesError && (
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
            {loading ? (
              <LoadingIndicator />
            ) : isEmpty(networkData) ? (
              <EmptyState message="No network data found." />
            ) : (
              <ReactFlowGraph
                allowFullscreen
                baseNodes={baseNodes}
                baseEdges={baseEdges}
                dagreOptions={options}
                nodeTypes={nodeTypes}
                minZoom={0.03}
                nodesDraggable
                nodeDragThreshold={5}
              />
            )}
          </Card>
        </WrapperSC>
      </ReactFlowProvider>
    </ExpandedNetworkInfoCtx>
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
  edges: Edge[]
} {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const workloadSet: Record<string, NetworkMeshWorkloadFragment> = {}
  networkData.forEach((networkEdge) => {
    const statsNodeId = `statistics-from-${networkEdge.from.id}-to-${networkEdge.to.id}`
    workloadSet[networkEdge.from.id] = networkEdge.from
    workloadSet[networkEdge.to.id] = networkEdge.to
    nodes.push({
      id: statsNodeId,
      position: { x: 0, y: 0 },
      type: 'statistics',
      data: { ...networkEdge.statistics },
    })
    edges.push({
      id: `into-${statsNodeId}`,
      source: networkEdge.from.id,
      target: statsNodeId,
      type: EdgeType.BezierDirected,
    })
    edges.push({
      id: `out-of-${statsNodeId}`,
      source: statsNodeId,
      target: networkEdge.to.id,
      type: EdgeType.BezierDirected,
    })
  })
  Object.values(workloadSet).forEach((workload) => {
    nodes.push({
      id: workload.id,
      position: { x: 0, y: 0 },
      type: 'workload',
      data: { ...workload },
    })
  })
  return { nodes, edges }
}

const options: DagreGraphOptions = {
  nodesep: 16,
  ranksep: 16,
  edgesep: 5,
}
