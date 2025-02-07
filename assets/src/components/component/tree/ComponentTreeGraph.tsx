import { useMemo } from 'react'
import 'reactflow/dist/style.css'

import {
  ComponentTreeFragment,
  ServiceDeploymentComponentFragment,
} from 'generated/graphql'
import { ReactFlowGraph } from '../../utils/reactflow/graph'
import { ComponentTreeNode } from './ComponentTreeNode'
import { getTreeNodesAndEdges } from './getTreeNodesAndEdges'
import { DagreGraphOptions } from 'components/cd/pipelines/utils/nodeLayouter'

const nodeTypes = {
  component: ComponentTreeNode,
}

export function ComponentTreeGraph({
  tree,
  component,
}: {
  tree: ComponentTreeFragment
  component: ServiceDeploymentComponentFragment
}) {
  const { nodes: baseNodes, edges: baseEdges } = useMemo(
    () => getTreeNodesAndEdges(tree, component.kind.toLowerCase()),
    [component, tree]
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
