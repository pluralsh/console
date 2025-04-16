import {
  Card,
  EmptyState,
  Flex,
  Input,
  NamespaceIcon,
  SearchIcon,
} from '@pluralsh/design-system'
import { NamespaceFilter } from 'components/kubernetes/common/NamespaceFilter'
import {
  NetworkMeshEdgeFragment,
  useClusterNamespacesQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useParams } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import LoadingIndicator from '../LoadingIndicator'
import { TimestampSliderButton } from '../TimestampSlider'
import { useMemo } from 'react'
import { Edge, Node } from '@xyflow/react'
import { MeshStatisticsNode, MeshWorkloadNode } from './NetworkMeshNodes'
import { DagreGraphOptions } from 'components/cd/pipelines/utils/nodeLayouter'
import { ReactFlowGraph } from '../reactflow/graph'

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
            baseNodes={baseNodes}
            baseEdges={baseEdges}
            dagreOptions={options}
            nodeTypes={nodeTypes}
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
  console.log(networkData)
  return { nodes: [], edges: [] }
  // const nodes: Node[] = []
  // const edges: Edge[] = []
  // state?.state?.filter(isNonNullable).forEach((ssr) => {
  //   nodes.push({
  //     id: ssr.identifier,
  //     position: { x: 0, y: 0 },
  //     type: NodeType.Stage,
  //     data: { ...ssr },
  //   })
  //   edges.push(
  //     ...(ssr.links ?? []).filter(isNonNullable).map((link) => ({
  //       type: EdgeType.Bezier,
  //       updatable: false,
  //       id: `${ssr.identifier}${link}`,
  //       source: ssr.identifier,
  //       target: link,
  //     }))
  //   )
  // })
  // return { nodes, edges }
}

const options: DagreGraphOptions = {
  ranksep: 50,
}
