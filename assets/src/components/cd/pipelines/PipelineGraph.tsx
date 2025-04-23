import { PipelineFragment } from 'generated/graphql'
import { useMemo } from 'react'

import { ReactFlowGraph } from '../../utils/reactflow/ReactFlowGraph'

import { LayoutOptions } from 'elkjs'
import { ApprovalNode } from './nodes/ApprovalNode'
import { JobNode } from './nodes/JobNode'
import { StageNode } from './nodes/StageNode'
import { TestsNode } from './nodes/TestsNode'
import { NodeType, getNodesAndEdges } from './utils/getNodesAndEdges'

const nodeTypes = {
  [NodeType.Stage]: StageNode,
  [NodeType.Approval]: ApprovalNode,
  [NodeType.Job]: JobNode,
  [NodeType.Tests]: TestsNode,
}

export function Pipeline({ pipeline }: { pipeline: PipelineFragment }) {
  const { nodes: baseNodes, edges: baseEdges } = useMemo(
    () => getNodesAndEdges(pipeline),
    [pipeline]
  )

  return (
    <ReactFlowGraph
      baseNodes={baseNodes}
      baseEdges={baseEdges}
      elkOptions={pipelineElkOptions}
      nodeTypes={nodeTypes}
    />
  )
}

export const pipelineElkOptions: LayoutOptions = {
  'elk.algorithm': 'layered',
  'elk.layered.nodePlacement.strategy': 'SIMPLE',
  'elk.layered.spacing.nodeNodeBetweenLayers': '55',
  'elk.layered.spacing.edgeNodeBetweenLayers': '50',
  'elk.spacing.portPort': '1',
}
