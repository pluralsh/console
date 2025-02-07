import { PipelineFragment } from 'generated/graphql'
import { useMemo } from 'react'

import 'reactflow/dist/style.css'

import { ReactFlowGraph } from '../../utils/reactflow/graph'

import { ApprovalNode } from './nodes/ApprovalNode'
import { JobNode } from './nodes/JobNode'
import { StageNode } from './nodes/StageNode'
import { TestsNode } from './nodes/TestsNode'
import { NodeType, getNodesAndEdges } from './utils/getNodesAndEdges'
import { DagreGraphOptions } from './utils/nodeLayouter'

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
      dagreOptions={options}
      nodeTypes={nodeTypes}
    />
  )
}

const options: DagreGraphOptions = {
  ranksep: 50,
}
