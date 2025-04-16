import {
  Card,
  EmptyState,
  Flex,
  Input,
  NamespaceIcon,
  SearchIcon,
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
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import LoadingIndicator from '../LoadingIndicator'
import { EdgeType } from '../reactflow/edges'
import { ReactFlowGraph } from '../reactflow/graph'
import { TimestampSliderButton } from '../TimestampSlider'
import { MeshStatisticsNode, MeshWorkloadNode } from './NetworkGraphNodes'

const nodeTypes = {
  workload: MeshWorkloadNode,
  statistics: MeshStatisticsNode,
}

export function NetworkGraph({
  networkData,
  loading,
  q,
  setQ,
  namespace,
  setNamespace,
  setTimestamp,
  isTimestampSet,
}: {
  networkData: NetworkMeshEdgeFragment[]
  loading?: boolean
  q: string
  setQ: (q: string) => void
  namespace?: string
  setNamespace: (namespace?: string) => void
  setTimestamp: (timestamp: string | undefined) => void
  isTimestampSet: boolean
}) {
  const { colors } = useTheme()
  const { clusterId } = useParams()
  const { data: namespacesData, error: namespacesError } =
    useClusterNamespacesQuery({
      variables: { clusterId },
    })
  const namespaces =
    namespacesData?.namespaces
      ?.filter(isNonNullable)
      .map((ns) => ns.metadata.name) ?? []

  const { nodes: baseNodes, edges: baseEdges } = useMemo(
    () => getNetworkNodesAndEdges(networkData),
    [networkData]
  )

  return (
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
            />
          )}
        </Card>
      </WrapperSC>
    </ReactFlowProvider>
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
    const statsNodeId = `statistics-${networkEdge.id}`
    workloadSet[networkEdge.from.id] = networkEdge.from
    workloadSet[networkEdge.to.id] = networkEdge.to
    nodes.push({
      id: statsNodeId,
      position: { x: 0, y: 0 },
      type: 'statistics',
      data: { ...networkEdge.statistics },
    })
    edges.push({
      id: `${networkEdge.from.id}-${statsNodeId}`,
      source: networkEdge.from.id,
      target: statsNodeId,
      type: EdgeType.BezierDirected,
    })
    edges.push({
      id: `${statsNodeId}-${networkEdge.to.id}`,
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

const options: DagreGraphOptions = {}
