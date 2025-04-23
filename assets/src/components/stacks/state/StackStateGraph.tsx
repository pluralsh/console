import { type Edge, type Node } from '@xyflow/react'
import { StackState } from 'generated/graphql'
import { useMemo } from 'react'

import { isNonNullable } from '../../../utils/isNonNullable'
import { NodeType } from '../../cd/pipelines/utils/getNodesAndEdges'
import { EdgeType } from '../../utils/reactflow/edges'
import { ReactFlowGraph } from '../../utils/reactflow/ReactFlowGraph'

import { LayoutOptions } from 'elkjs'
import { StackStateGraphNode } from './StackStateGraphNode'

const nodeTypes = {
  [NodeType.Stage]: StackStateGraphNode,
}

function getNodesAndEdges(state: StackState) {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const existingIdentifiers = new Set(
    state?.state?.map((ssr) => ssr?.identifier)
  )
  state?.state?.filter(isNonNullable).forEach((ssr) => {
    nodes.push({
      id: ssr.identifier,
      position: { x: 0, y: 0 },
      type: NodeType.Stage,
      data: { ...ssr },
      style: { opacity: 0 },
    })

    edges.push(
      ...(ssr.links ?? [])
        .filter(
          (link): link is string => !!link && existingIdentifiers.has(link)
        )
        .map((link) => ({
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
      allowFullscreen
      baseNodes={baseNodes}
      baseEdges={baseEdges}
      elkOptions={options}
      nodeTypes={nodeTypes}
      minZoom={0.05}
    />
  )
}

const options: LayoutOptions = {
  'elk.algorithm': 'layered',
}
