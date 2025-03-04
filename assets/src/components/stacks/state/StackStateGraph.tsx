import { StackState } from 'generated/graphql'
import { useMemo } from 'react'
import { type Edge, type Node } from '@xyflow/react'

import { NodeType } from '../../cd/pipelines/utils/getNodesAndEdges'
import { isNonNullable } from '../../../utils/isNonNullable'
import { ReactFlowGraph } from '../../utils/reactflow/graph'
import { EdgeType } from '../../utils/reactflow/edges'

import { StackStateGraphNode } from './StackStateGraphNode'
import { DagreGraphOptions } from 'components/cd/pipelines/utils/nodeLayouter'

const nodeTypes = {
  [NodeType.Stage]: StackStateGraphNode,
}

function getNodesAndEdges(state: StackState) {
  const nodes: Node[] = []
  const edges: Edge[] = []

  state?.state?.filter(isNonNullable).forEach((ssr) => {
    nodes.push({
      id: ssr.identifier,
      position: { x: 0, y: 0 },
      type: NodeType.Stage,
      data: { ...ssr },
    })

    edges.push(
      ...(ssr.links ?? []).filter(isNonNullable).map((link) => ({
        type: EdgeType.Bezier,
        updatable: false,
        id: `${ssr.identifier}${link}`,
        source: ssr.identifier,
        target: link,
      }))
    )
  })

  return { nodes, edges }
}

export function StackStateGraph({ state }: { state: StackState }) {
  const { nodes: baseNodes, edges: baseEdges } = useMemo(
    () => getNodesAndEdges(state),
    [state]
  )

  return (
    <ReactFlowGraph
      dagreOptions={options}
      allowFullscreen
      baseNodes={baseNodes}
      baseEdges={baseEdges}
      nodeTypes={nodeTypes}
    />
  )
}

const options: DagreGraphOptions = {
  align: 'UL',
  nodesep: 16,
  ranksep: 16,
  edgesep: 5,
  ranker: 'longest-path',
}
