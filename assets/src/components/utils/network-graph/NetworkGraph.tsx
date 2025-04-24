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
import { Edge, Node, ReactFlowProvider, useReactFlow } from '@xyflow/react'
import { useThrottle } from 'components/hooks/useThrottle'
import { NamespaceFilter } from 'components/kubernetes/common/NamespaceFilter'
import Fuse from 'fuse.js'
import {
  NetworkMeshEdgeFragment,
  NetworkMeshWorkloadFragment,
  useClusterNamespacesQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { ComponentProps, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import LoadingIndicator from '../LoadingIndicator'
import { EdgeType } from '../reactflow/edges'
import { ReactFlowGraph } from '../reactflow/ReactFlowGraph'
import { TimestampSliderButton } from '../TimestampSlider'
import { MeshWorkloadNode } from './NetworkGraphNodes'
import { NetworkGraphStatistics } from './NetworkGraphStatistics'

const nodeTypes = { workload: MeshWorkloadNode }

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
  const [selectedEdge, setSelectedEdge] = useState<Nullable<string>>()

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
              updateEdge(id, {
                style: { stroke: colors['text-light'], strokeWidth: 2 },
              })
            }
            onEdgeMouseLeave={(_, { id }) =>
              updateEdge(id, {
                style: { stroke: colors.border, strokeWidth: 1 },
              })
            }
            onSelectionChange={({ edges }) => setSelectedEdge(edges[0]?.id)}
            edgesSelectable
            edgesFocusable
            additionalOverlays={
              selectedEdge && (
                <NetworkGraphStatistics selectedEdgeId={selectedEdge} />
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
  edges: Edge[]
} {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const workloadSet: Record<string, NetworkMeshWorkloadFragment> = {}
  networkData.forEach((networkEdge) => {
    workloadSet[networkEdge.from.id] = networkEdge.from
    workloadSet[networkEdge.to.id] = networkEdge.to
    edges.push({
      id: networkEdge.id,
      source: networkEdge.from.id,
      target: networkEdge.to.id,
      type: EdgeType.Network,
      data: { statistics: networkEdge.statistics },
    })
  })
  Object.values(workloadSet).forEach((workload) => {
    nodes.push({
      id: workload.id,
      position: { x: 0, y: 0 },
      type: 'workload',
      data: workload,
    })
  })
  return { nodes, edges }
}

const elkOptions = {
  'elk.algorithm': 'force',
  'elk.spacing.nodeNode': '5',
}
